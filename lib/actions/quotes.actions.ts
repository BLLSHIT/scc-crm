'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { quoteSchema, type QuoteInput } from '@/lib/validations/quote.schema'
import { calcQuoteTotals } from '@/lib/utils/line-items'
import { getNextDocumentNumber } from '@/lib/db/settings'
import type { QuoteStatus } from '@/lib/db/quotes'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

function quotePayload(input: QuoteInput) {
  return {
    title: input.title,
    validUntil: input.validUntil,
    companyId: input.companyId || null,
    contactId: input.contactId || null,
    teamMemberId: input.teamMemberId || null,
    dealId: input.dealId || null,
    greeting: input.greeting?.trim() || null,
    intro: input.intro?.trim() || null,
    footer: input.footer?.trim() || null,
    paymentTerms: input.paymentTerms?.trim() || null,
  }
}

async function replaceLineItems(quoteId: string, items: QuoteInput['lineItems']) {
  const supabase = await createClient()
  // Cascade-delete vorhandener Items
  await supabase.from('quote_line_items').delete().eq('quoteId', quoteId)
  if (!items.length) return null
  const rows = items.map((it, idx) => ({
    id: randomUUID(),
    quoteId,
    productId: it.productId || null,
    name: it.name,
    description: it.description?.trim() || null,
    imageUrl: it.imageUrl?.trim() || null,
    unit: it.unit || 'Stück',
    quantity: it.quantity,
    unitPriceNet: it.unitPriceNet,
    discountPercent: it.discountPercent,
    vatRate: it.vatRate,
    isOptional: it.isOptional,
    sortOrder: it.sortOrder ?? idx,
    updatedAt: new Date().toISOString(),
  }))
  const { error } = await supabase.from('quote_line_items').insert(rows)
  if (error) {
    console.error('[replaceLineItems] error:', error)
    return error.message
  }
  return null
}

export async function createQuote(input: QuoteInput): Promise<ActionResult> {
  const parsed = quoteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const id = randomUUID()
  const quoteNumber = await getNextDocumentNumber('quote')
  const totals = calcQuoteTotals(parsed.data.lineItems)

  const { error } = await supabase.from('quotes').insert({
    id,
    quoteNumber,
    ...quotePayload(parsed.data),
    subtotalNet: totals.subtotalNet,
    totalDiscount: totals.totalDiscount,
    totalVat: totals.totalVat,
    totalGross: totals.totalGross,
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[createQuote] error:', error)
    return { error: { _form: [error.message] } }
  }

  const liErr = await replaceLineItems(id, parsed.data.lineItems)
  if (liErr) {
    return {
      error: { _form: [`Angebot angelegt (${quoteNumber}), aber Positionen fehlerhaft: ${liErr}`] },
    }
  }

  revalidatePath('/quotes')
  return { redirectTo: `/quotes/${id}` }
}

export async function updateQuote(id: string, input: QuoteInput): Promise<ActionResult> {
  const parsed = quoteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const totals = calcQuoteTotals(parsed.data.lineItems)

  const { error } = await supabase
    .from('quotes')
    .update({
      ...quotePayload(parsed.data),
      subtotalNet: totals.subtotalNet,
      totalDiscount: totals.totalDiscount,
      totalVat: totals.totalVat,
      totalGross: totals.totalGross,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) {
    console.error('[updateQuote] error:', error)
    return { error: { _form: [error.message] } }
  }

  const liErr = await replaceLineItems(id, parsed.data.lineItems)
  if (liErr) {
    return { error: { _form: [`Positionen-Fehler: ${liErr}`] } }
  }

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)
  return { redirectTo: `/quotes/${id}` }
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) {
    console.error('[deleteQuote] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/quotes')
  redirect('/quotes')
}

export async function updateQuoteStatus(id: string, newStatus: QuoteStatus): Promise<ActionResult> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  }
  const now = new Date().toISOString()
  if (newStatus === 'sent')     patch.sentAt     = now
  if (newStatus === 'accepted') patch.acceptedAt = now
  if (newStatus === 'declined') patch.declinedAt = now

  const { error } = await supabase.from('quotes').update(patch).eq('id', id)
  if (error) {
    console.error('[updateQuoteStatus] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)
  return {}
}
