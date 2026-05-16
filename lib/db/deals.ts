import { createClient } from '@/lib/supabase/server'

export async function getDefaultPipeline() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipelines')
    .select('*')
    .eq('isDefault', true)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getDealsForPipeline(pipelineId: string) {
  const supabase = await createClient()

  const [{ data: stages, error: stagesError }, { data: deals, error: dealsError }] =
    await Promise.all([
      supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipelineId', pipelineId)
        .order('order', { ascending: true }),
      supabase
        .from('deals')
        .select(
          `id, title, value, currency, probability, expectedCloseAt, stageId, createdAt,
           locationCity, plannedDelivery,
           company:companies(id, name),
           teamMember:team_members(firstName, lastName)`
        )
        .eq('pipelineId', pipelineId)
        .order('createdAt', { ascending: false }),
    ])

  if (stagesError) throw new Error(stagesError.message)
  if (dealsError) throw new Error(dealsError.message)

  if (!deals || deals.length === 0) {
    return { stages: stages ?? [], deals: [] }
  }

  const dealIds = deals.map((d) => d.id)

  // Batch-fetch all related data in parallel
  const [quotesRes, attachRes, tasksRes, contactsRes] = await Promise.all([
    supabase
      .from('quotes')
      .select('dealId, status, totalGross, createdAt, quote_line_items(quantity, product:products(purchasePriceNet))')
      .in('dealId', dealIds),
    supabase
      .from('deal_attachments')
      .select('dealId')
      .in('dealId', dealIds),
    supabase
      .from('tasks')
      .select('dealId, status')
      .in('dealId', dealIds)
      .not('status', 'eq', 'done'),
    supabase
      .from('deal_contacts')
      .select('dealId, contact:contacts(firstName, lastName)')
      .in('dealId', dealIds),
  ])

  // Build lookup maps
  type QuoteRow = NonNullable<typeof quotesRes.data>[number]
  const quotesByDeal = new Map<string, QuoteRow[]>()
  for (const q of (quotesRes.data ?? [])) {
    if (!quotesByDeal.has(q.dealId)) quotesByDeal.set(q.dealId, [])
    quotesByDeal.get(q.dealId)!.push(q)
  }

  const attachCountByDeal = new Map<string, number>()
  for (const a of (attachRes.data ?? [])) {
    attachCountByDeal.set(a.dealId, (attachCountByDeal.get(a.dealId) ?? 0) + 1)
  }

  const openTaskCountByDeal = new Map<string, number>()
  for (const t of (tasksRes.data ?? [])) {
    openTaskCountByDeal.set(t.dealId, (openTaskCountByDeal.get(t.dealId) ?? 0) + 1)
  }

  const primaryContactByDeal = new Map<string, string>()
  for (const dc of (contactsRes.data ?? [])) {
    if (!primaryContactByDeal.has(dc.dealId) && dc.contact) {
      const c = (dc.contact as unknown) as { firstName: string; lastName: string }
      primaryContactByDeal.set(dc.dealId, `${c.firstName} ${c.lastName}`)
    }
  }

  // Enrich each deal with computed fields
  const enrichedDeals = deals.map((deal) => {
    const quotes = quotesByDeal.get(deal.id) ?? []
    const acceptedQuote = quotes.find((q) => q.status === 'accepted') ?? null

    // Latest non-accepted quote (totalGross may be null if not yet calculated)
    const latestOtherQuote = !acceptedQuote
      ? [...quotes.filter(q => q.status !== 'accepted' && q.totalGross != null)]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .sort((a, b) => new Date((b as any).createdAt ?? 0).getTime() - new Date((a as any).createdAt ?? 0).getTime())[0] ?? null
      : null

    let marginPercent: number | null = null
    let marginEuro: number | null = null
    if (acceptedQuote && Number(acceptedQuote.totalGross) > 0) {
      const totalGross = Number(acceptedQuote.totalGross)
      let totalEk = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const li of ((acceptedQuote.quote_line_items as any[]) ?? [])) {
        totalEk += Number(li.product?.purchasePriceNet ?? 0) * Number(li.quantity ?? 1)
      }
      // Kein EK eingetragen → Marge = 0
      marginEuro = totalEk > 0 ? Math.round(totalGross - totalEk) : 0
      marginPercent = totalEk > 0 ? Math.round(((totalGross - totalEk) / totalGross) * 100) : 0
    }

    return {
      ...deal,
      scc: (Array.isArray(deal.teamMember) ? (deal.teamMember[0] as { firstName: string; lastName: string } | undefined) ?? null : (deal.teamMember as { firstName: string; lastName: string } | null) ?? null),
      primaryContactName: primaryContactByDeal.get(deal.id) ?? null,
      quotesCount: quotes.length,
      acceptedQuoteTotal: acceptedQuote ? Number(acceptedQuote.totalGross) : null,
      latestQuoteTotal: latestOtherQuote ? Number(latestOtherQuote.totalGross) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      latestQuoteStatus: (latestOtherQuote as any)?.status ?? null,
      attachmentsCount: attachCountByDeal.get(deal.id) ?? 0,
      openTasksCount: openTaskCountByDeal.get(deal.id) ?? 0,
      marginPercent,
      marginEuro,
    }
  })

  return { stages: stages ?? [], deals: enrichedDeals }
}

export async function getActiveDealOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select('id, title, company:companies(id, name)')
    .order('createdAt', { ascending: false })
    .limit(200)
  if (error) {
    console.error('[getActiveDealOptions] error:', error)
    return []
  }
  return data ?? []
}

export async function getDealById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(
      `id, title, value, currency, probability, expectedCloseAt, description, lostReason,
       pipelineId, stageId, companyId, ownerId, teamMemberId, projectStatus, createdAt, updatedAt,
       locationStreet, locationZip, locationCity, locationCountry, plannedDelivery,
       company:companies(id, name),
       owner:profiles(id, firstName, lastName),
       teamMember:team_members(id, firstName, lastName, email, mobile, position),
       stage:pipeline_stages(id, name, color, isWon, isLost),
       pipeline:pipelines(id, name)`
    )
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getDealById] error:', JSON.stringify(error))
    throw new Error(error.message)
  }

  // Deal-Contacts (Stakeholder) separat laden — Nested-Join über Junction-Tabelle
  // verursachte intermittierende Probleme mit PostgREST
  const { data: dcRows, error: dcError } = await supabase
    .from('deal_contacts')
    .select('role, contact:contacts(id, firstName, lastName, email, position)')
    .eq('dealId', id)
  if (dcError) {
    console.error('[getDealById] deal_contacts error:', dcError)
  }

  return { ...data, contacts: dcRows ?? [] }
}
