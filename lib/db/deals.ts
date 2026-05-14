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
           company:companies(id, name),
           owner:profiles(id, firstName, lastName)`
        )
        .eq('pipelineId', pipelineId)
        .order('createdAt', { ascending: false }),
    ])

  if (stagesError) throw new Error(stagesError.message)
  if (dealsError) throw new Error(dealsError.message)

  return { stages: stages ?? [], deals: deals ?? [] }
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
       pipelineId, stageId, companyId, ownerId, teamMemberId, createdAt, updatedAt,
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
