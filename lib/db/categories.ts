import { createClient } from '@/lib/supabase/server'

export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('sortOrder', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.error('[getCategories] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getActiveCategoryOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('isActive', true)
    .order('sortOrder', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.error('[getActiveCategoryOptions] error:', error)
    return []
  }
  return data ?? []
}

export async function getCategoryById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getCategoryById] error:', error)
    throw new Error(error.message)
  }
  return data
}
