import { createClient } from '@/lib/supabase/server'

export interface ProductFilters {
  q?: string
  category?: string
  activeOnly?: boolean
}

export async function getProducts(filters: ProductFilters = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })
  if (filters.activeOnly) query = query.eq('isActive', true)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.q) {
    query = query.or(`name.ilike.%${filters.q}%,sku.ilike.%${filters.q}%,description.ilike.%${filters.q}%`)
  }
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
