import { createClient } from '@/lib/supabase/server'

export async function getProducts(activeOnly = false) {
  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })
  if (activeOnly) query = query.eq('isActive', true)
  const { data, error } = await query
  if (error) {
    console.error('[getProducts] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getActiveProductOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, unit, defaultPriceNet, defaultVatRate, imageUrl')
    .eq('isActive', true)
    .order('name', { ascending: true })
  if (error) {
    console.error('[getActiveProductOptions] error:', error)
    return []
  }
  return data ?? []
}

export async function getProductById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getProductById] error:', error)
    throw new Error(error.message)
  }
  return data
}
