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

export async function getDealById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(
      `*,
       company:companies(id, name),
       owner:profiles(id, firstName, lastName),
       stage:pipeline_stages(id, name, color, isWon, isLost),
       pipeline:pipelines(id, name),
       contacts:deal_contacts(
         role,
         contact:contacts(id, firstName, lastName, email, position)
       )`
    )
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}
