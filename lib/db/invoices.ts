import { createClient } from '@/lib/supabase/server'

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceFilters {
  q?: string
  status?: InvoiceStatus
  companyId?: string
  dealId?: string
  quoteId?: string
}

export async function getInvoices(filters: InvoiceFilters = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('invoices')
    .select(
      `id, invoiceNumber, title, status, issueDate, dueDate,
       totalGross, totalPaid, createdAt,
       company:companies(id, name, email),
       contact:contacts(id, firstName, lastName, email)`
    )
    .order('createdAt', { ascending: false })

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,invoiceNumber.ilike.%${filters.q}%`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.companyId) query = query.eq('companyId', filters.companyId)
  if (filters.dealId) query = query.eq('dealId', filters.dealId)
  if (filters.quoteId) query = query.eq('quoteId', filters.quoteId)

  const { data, error } = await query
  if (error) {
    console.error('[getInvoices] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getInvoiceById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `*,
       company:companies(id, name, website, email, phone, city, country),
       contact:contacts(id, firstName, lastName, email, phone, position),
       teamMember:team_members(id, firstName, lastName, email, mobile, position),
       deal:deals(id, title),
       quote:quotes(id, quoteNumber, title)`
    )
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getInvoiceById] error:', error)
    throw new Error(error.message)
  }

  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoiceId', id)
    .order('sortOrder', { ascending: true })

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('invoiceId', id)
    .order('paymentDate', { ascending: false })

  return { ...data, lineItems: lineItems ?? [], payments: payments ?? [] }
}

export async function getInvoicesByDealId(dealId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select('id, invoiceNumber, title, status, totalGross, dueDate, createdAt')
    .eq('dealId', dealId)
    .order('createdAt', { ascending: false })
  return data ?? []
}

export async function getInvoiceForQuote(quoteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select('id, invoiceNumber, status, totalGross')
    .eq('quoteId', quoteId)
    .maybeSingle()
  return data
}
