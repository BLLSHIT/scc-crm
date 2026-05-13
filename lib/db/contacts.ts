import { createClient } from '@/lib/supabase/server'

export interface ContactFilters {
  q?: string
  companyId?: string
  page?: number
  limit?: number
}

export async function getContacts(filters: ContactFilters = {}) {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const limit = filters.limit ?? 25
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('contacts')
    .select(
      `id, firstName, lastName, email, phone, position, source, tags, createdAt, updatedAt,
       company:companies(id, name),
       owner:profiles(id, firstName, lastName)`,
      { count: 'exact' }
    )
    .order('createdAt', { ascending: false })
    .range(from, to)

  if (filters.q) {
    query = query.or(
      `firstName.ilike.%${filters.q}%,lastName.ilike.%${filters.q}%,email.ilike.%${filters.q}%`
    )
  }
  if (filters.companyId) {
    query = query.eq('companyId', filters.companyId)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return { contacts: data ?? [], total: count ?? 0, page, limit }
}

export async function getContactById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select(
      `*,
       company:companies(id, name),
       owner:profiles(id, firstName, lastName),
       deals:deal_contacts(
         role,
         deal:deals(
           id, title, value, currency,
           stage:pipeline_stages(id, name, color)
         )
       )`
    )
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}
