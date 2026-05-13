import { createClient } from '@/lib/supabase/server'

export interface CompanyFilters {
  q?: string
  page?: number
  limit?: number
}

export async function getCompanies(filters: CompanyFilters = {}) {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const limit = filters.limit ?? 25
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('companies')
    .select('id, name, industry, city, country, phone, email, createdAt, updatedAt', {
      count: 'exact',
    })
    .order('createdAt', { ascending: false })
    .range(from, to)

  if (filters.q) {
    query = query.ilike('name', `%${filters.q}%`)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return { companies: data ?? [], total: count ?? 0, page, limit }
}

export async function getAllCompanyOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .order('name', { ascending: true })
  if (error) {
    console.error('[getAllCompanyOptions] error:', error)
    return []
  }
  return data ?? []
}

export async function getCompanyById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .select(
      `id, name, website, industry, size, country, city, phone, email, tags, createdAt, updatedAt,
       contacts(id, firstName, lastName, email, position),
       deals(id, title, value, currency, stageId)`
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getCompanyById] error:', JSON.stringify(error))
    throw new Error(error.message)
  }
  return data
}
