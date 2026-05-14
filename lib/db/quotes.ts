import { createClient } from '@/lib/supabase/server'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export interface QuoteFilters {
  q?: string
  status?: QuoteStatus
  companyId?: string
  dealId?: string
}

export async function getQuotes(filters: QuoteFilters = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('quotes')
    .select(
      `id, quoteNumber, title, status, validUntil, totalGross, createdAt,
       company:companies(id, name),
       contact:contacts(id, firstName, lastName)`
    )
    .order('createdAt', { ascending: false })

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,quoteNumber.ilike.%${filters.q}%`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.companyId) query = query.eq('companyId', filters.companyId)
  if (filters.dealId) query = query.eq('dealId', filters.dealId)

  const { data, error } = await query
  if (error) {
    console.error('[getQuotes] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getQuoteById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quotes')
    .select(
      `*,
       company:companies(id, name, website, email, phone, city, country),
       contact:contacts(id, firstName, lastName, email, phone, position),
       teamMember:team_members(id, firstName, lastName, email, mobile, position),
       deal:deals(id, title)`
    )
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getQuoteById] error:', error)
    throw new Error(error.message)
  }

  const { data: lineItems, error: liError } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quoteId', id)
    .order('sortOrder', { ascending: true })
  if (liError) {
    console.error('[getQuoteById] line items error:', liError)
  }

  return { ...data, lineItems: lineItems ?? [] }
}
