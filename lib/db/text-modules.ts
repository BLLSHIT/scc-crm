import { createClient } from '@/lib/supabase/server'

export type TextModuleType = 'greeting' | 'intro' | 'footer' | 'payment_terms' | 'other'

export async function getTextModules(type?: TextModuleType) {
  const supabase = await createClient()
  let query = supabase
    .from('text_modules')
    .select('*')
    .order('type', { ascending: true })
    .order('sortOrder', { ascending: true })
  if (type) query = query.eq('type', type)
  const { data, error } = await query
  if (error) {
    console.error('[getTextModules] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getTextModuleById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('text_modules')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getTextModuleById] error:', error)
    throw new Error(error.message)
  }
  return data
}
