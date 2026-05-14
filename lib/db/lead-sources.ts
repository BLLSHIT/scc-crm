import { createClient } from '@/lib/supabase/server'

export async function getLeadSources() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_sources')
    .select('*')
    .order('sortOrder', { ascending: true })
    .order('name', { ascending: true })
  if (error) { console.error('[getLeadSources]', error); throw new Error(error.message) }
  return data ?? []
}

export async function getActiveLeadSourceOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_sources')
    .select('id, name')
    .eq('isActive', true)
    .order('sortOrder', { ascending: true })
    .order('name', { ascending: true })
  if (error) { console.error('[getActiveLeadSourceOptions]', error); return [] }
  return data ?? []
}

export async function getLeadSourceById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_sources').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}
