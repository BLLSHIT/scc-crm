import { createClient } from '@/lib/supabase/server'

export async function getIndustries() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('industries')
    .select('*')
    .order('sortOrder', { ascending: true })
    .order('name', { ascending: true })
  if (error) { console.error('[getIndustries]', error); throw new Error(error.message) }
  return data ?? []
}

export async function getActiveIndustryOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('industries')
    .select('id, name')
    .eq('isActive', true)
    .order('sortOrder', { ascending: true })
    .order('name', { ascending: true })
  if (error) { console.error('[getActiveIndustryOptions]', error); return [] }
  return data ?? []
}

export async function getIndustryById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('industries').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}
