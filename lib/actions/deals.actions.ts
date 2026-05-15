'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { dealSchema, type DealInput } from '@/lib/validations/deal.schema'
import { logActivity } from '@/lib/db/activity-logs'
import { runWorkflows } from '@/lib/workflows/engine'

export type ActionResult = { error?: Record<string, string[]>; redirectTo?: string }

async function syncDealContacts(dealId: string, contactIds: string[]) {
  const supabase = await createClient()
  // Delete all existing links for this deal
  const { error: delError } = await supabase
    .from('deal_contacts')
    .delete()
    .eq('dealId', dealId)
  if (delError) {
    console.error('[syncDealContacts] delete error:', delError)
    return delError.message
  }
  if (contactIds.length === 0) return null
  const rows = contactIds.map((contactId) => ({ dealId, contactId, role: null }))
  const { error: insError } = await supabase.from('deal_contacts').insert(rows)
  if (insError) {
    console.error('[syncDealContacts] insert error:', insError)
    return insError.message
  }
  return null
}

export async function createDeal(
  input: DealInput,
  contactIds: string[] = []
): Promise<ActionResult> {
  const parsed = dealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('deals')
    .insert({
      id: randomUUID(),
      ...parsed.data,
      expectedCloseAt: parsed.data.expectedCloseAt || null,
      companyId: parsed.data.companyId || null,
      ownerId: parsed.data.ownerId || null,
      teamMemberId: parsed.data.teamMemberId || null,
      projectStatus: parsed.data.projectStatus && parsed.data.projectStatus !== 'none'
        ? parsed.data.projectStatus
        : null,
      locationStreet: parsed.data.locationStreet || null,
      locationZip: parsed.data.locationZip || null,
      locationCity: parsed.data.locationCity || null,
      locationCountry: parsed.data.locationCountry || null,
      plannedDelivery: parsed.data.plannedDelivery || null,
      updatedAt: now,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createDeal] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  if (contactIds.length > 0) {
    const syncErr = await syncDealContacts(data.id, contactIds)
    if (syncErr) {
      return { error: { _form: [`Deal angelegt, aber Verknüpfung der Ansprechpersonen fehlgeschlagen: ${syncErr}`] } }
    }
  }

  await logActivity({
    entityType: 'deal',
    entityId: data.id,
    action: 'created',
    summary: `Deal „${parsed.data.title}" angelegt`,
  })

  revalidatePath('/deals')
  return { redirectTo: `/deals/${data.id}` }
}

export async function moveDealStage(
  dealId: string,
  stageId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: dealData } = await supabase
    .from('deals')
    .select('title, company:companies(name)')
    .eq('id', dealId)
    .single()

  const { error } = await supabase
    .from('deals')
    .update({ stageId, updatedAt: new Date().toISOString() })
    .eq('id', dealId)

  if (error) {
    console.error('[moveDealStage] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }
  await logActivity({
    entityType: 'deal',
    entityId: dealId,
    action: 'status_changed',
    summary: 'Pipeline-Stage geändert',
    metadata: { stageId },
  })
  try {
    await runWorkflows('deal_stage_changed', {
      dealId,
      stageId,
      dealTitle: dealData?.title,
      companyName: (dealData?.company as { name?: string } | null)?.name ?? undefined,
    })
  } catch (err) {
    console.error('[workflow] deal_stage_changed failed:', err)
  }
  revalidatePath('/deals')
  return {}
}

export async function updateDeal(
  id: string,
  input: DealInput,
  contactIds: string[] = []
): Promise<ActionResult> {
  const parsed = dealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase
    .from('deals')
    .update({
      ...parsed.data,
      expectedCloseAt: parsed.data.expectedCloseAt || null,
      companyId: parsed.data.companyId || null,
      ownerId: parsed.data.ownerId || null,
      teamMemberId: parsed.data.teamMemberId || null,
      projectStatus: parsed.data.projectStatus && parsed.data.projectStatus !== 'none'
        ? parsed.data.projectStatus
        : null,
      locationStreet: parsed.data.locationStreet || null,
      locationZip: parsed.data.locationZip || null,
      locationCity: parsed.data.locationCity || null,
      locationCountry: parsed.data.locationCountry || null,
      plannedDelivery: parsed.data.plannedDelivery || null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[updateDeal] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  const syncErr = await syncDealContacts(id, contactIds)
  if (syncErr) {
    return { error: { _form: [`Deal gespeichert, aber Verknüpfung der Ansprechpersonen fehlgeschlagen: ${syncErr}`] } }
  }

  await logActivity({
    entityType: 'deal',
    entityId: id,
    action: 'updated',
    summary: `Deal „${parsed.data.title}" geändert`,
  })

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  return { redirectTo: `/deals/${id}` }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) {
    console.error('[deleteDeal] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/deals')
  redirect('/deals')
}
