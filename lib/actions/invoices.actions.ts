'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { invoiceSchema, type InvoiceInput } from '@/lib/validations/invoice.schema'
import { calcQuoteTotals } from '@/lib/utils/line-items'
import { getNextDocumentNumber, getSettings } from '@/lib/db/settings'
import { logActivity } from '@/lib/db/activity-logs'
import type { InvoiceStatus } from '@/lib/db/invoices'

export type ActionResult = { error?: Record<string, string[]>; redirectTo?: string }

function invoicePayload(input: InvoiceInput) {
  return {
    title: input.title,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    companyId: input.companyId || null,
    contactId: input.contactId || null,
    teamMemberId: input.teamMemberId || null,
    dealId: input.dealId || null,
    quoteId: input.quoteId || null,
    greeting: input.greeting?.trim() || null,
    intro: input.intro?.trim() || null,
    footer: input.footer?.trim() || null,
    paymentTerms: input.paymentTerms?.trim() || null,
    globalDiscountPercent: input.globalDiscountPercent ?? 0,
  }
}

async function replaceLineItems(invoiceId: string, items: InvoiceInput['lineItems']) {
  const supabase = await createClient()
  await supabase.from('invoice_line_items').delete().eq('invoiceId', invoiceId)
  if (!items.length) return null
  const rows = items.map((it, idx) => ({
    id: randomUUID(),
    invoiceId,
    itemType: it.itemType ?? 'product',
    productId: it.productId || null,
    name: it.name,
    description: it.description?.trim() || null,
    imageUrl: it.imageUrl?.trim() || null,
    unit: it.unit || 'Stück',
    quantity: it.itemType === 'text' ? 0 : it.quantity,
    unitPriceNet: it.itemType === 'text' ? 0 : it.unitPriceNet,
    discountPercent: it.itemType === 'text' ? 0 : it.discountPercent,
    vatRate: it.itemType === 'text' ? 0 : it.vatRate,
    isOptional: it.itemType === 'text' ? false : it.isOptional,
    sortOrder: idx,
    updatedAt: new Date().toISOString(),
  }))
  const { error } = await supabase.from('invoice_line_items').insert(rows)
  if (error) {
    console.error('[replaceLineItems invoices] error:', error)
    return error.message
  }
  return null
}

export async function createInvoice(input: InvoiceInput): Promise<ActionResult> {
  const parsed = invoiceSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const id = randomUUID()
  const invoiceNumber = await getNextDocumentNumber('invoice')
  const totals = calcQuoteTotals(parsed.data.lineItems, parsed.data.globalDiscountPercent)

  const { error } = await supabase.from('invoices').insert({
    id,
    invoiceNumber,
    ...invoicePayload(parsed.data),
    subtotalNet: totals.subtotalNet,
    totalDiscount: totals.totalDiscount,
    totalVat: totals.totalVat,
    totalGross: totals.totalGross,
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[createInvoice] error:', error)
    return { error: { _form: [error.message] } }
  }

  const liErr = await replaceLineItems(id, parsed.data.lineItems)
  if (liErr) {
    return { error: { _form: [`Rechnung angelegt (${invoiceNumber}), Positionen fehlerhaft: ${liErr}`] } }
  }

  await logActivity({
    entityType: 'quote', // Rechnungen-Logs unter quote entityType (anpassen falls eigenes type)
    entityId: id,
    action: 'created',
    summary: `Rechnung ${invoiceNumber} „${parsed.data.title}" angelegt`,
  })

  revalidatePath('/invoices')
  return { redirectTo: `/invoices/${id}` }
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<ActionResult> {
  const parsed = invoiceSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const totals = calcQuoteTotals(parsed.data.lineItems, parsed.data.globalDiscountPercent)

  const { error } = await supabase
    .from('invoices')
    .update({
      ...invoicePayload(parsed.data),
      subtotalNet: totals.subtotalNet,
      totalDiscount: totals.totalDiscount,
      totalVat: totals.totalVat,
      totalGross: totals.totalGross,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) {
    console.error('[updateInvoice] error:', error)
    return { error: { _form: [error.message] } }
  }
  const liErr = await replaceLineItems(id, parsed.data.lineItems)
  if (liErr) return { error: { _form: [`Positionen-Fehler: ${liErr}`] } }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { redirectTo: `/invoices/${id}` }
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/invoices')
  redirect('/invoices')
}

export async function updateInvoiceStatus(id: string, newStatus: InvoiceStatus): Promise<ActionResult> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  }
  const now = new Date().toISOString()
  if (newStatus === 'open')      patch.sentAt = now
  if (newStatus === 'paid')      patch.paidAt = now
  if (newStatus === 'cancelled') patch.cancelledAt = now

  const { error } = await supabase.from('invoices').update(patch).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  await logActivity({
    entityType: 'quote',
    entityId: id,
    action: 'status_changed',
    summary: `Rechnungs-Status: ${newStatus}`,
  })
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return {}
}

/**
 * Konvertiert ein akzeptiertes Angebot in eine Rechnung.
 * Kopiert: Titel, Empfänger, SCC-Bearbeiter, Texte, Positionen, globalDiscount.
 * Verlinkt: quoteId.
 * Fälligkeit: heute + settings.defaultInvoiceDueDays.
 */
export async function convertQuoteToInvoice(quoteId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select(`*, lineItems:quote_line_items(*)`)
    .eq('id', quoteId)
    .single()
  if (qErr || !quote) {
    return { error: { _form: ['Angebot nicht gefunden.'] } }
  }

  const settings = await getSettings()
  const dueDays = settings?.defaultInvoiceDueDays ?? 14
  const issueDate = new Date()
  const dueDate = new Date(Date.now() + dueDays * 86_400_000)

  const id = randomUUID()
  const invoiceNumber = await getNextDocumentNumber('invoice')
  const totals = {
    subtotalNet: Number(quote.subtotalNet),
    totalDiscount: Number(quote.totalDiscount),
    totalVat: Number(quote.totalVat),
    totalGross: Number(quote.totalGross),
  }

  const { error: insErr } = await supabase.from('invoices').insert({
    id,
    invoiceNumber,
    title: quote.title,
    status: 'draft',
    issueDate: issueDate.toISOString(),
    dueDate: dueDate.toISOString(),
    companyId: quote.companyId,
    contactId: quote.contactId,
    teamMemberId: quote.teamMemberId,
    dealId: quote.dealId,
    quoteId: quote.id,
    subtotalNet: totals.subtotalNet,
    totalDiscount: totals.totalDiscount,
    globalDiscountPercent: Number(quote.globalDiscountPercent),
    totalVat: totals.totalVat,
    totalGross: totals.totalGross,
    greeting: quote.greeting,
    intro: quote.intro,
    footer: quote.footer,
    paymentTerms: quote.paymentTerms,
    updatedAt: new Date().toISOString(),
  })
  if (insErr) {
    console.error('[convertQuoteToInvoice] insert error:', insErr)
    return { error: { _form: [insErr.message] } }
  }

  // Positionen kopieren (außer optionale — die landen NICHT auf der Rechnung)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (quote.lineItems ?? []) as any[]
  const rows = items
    .filter((it) => !it.isOptional)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((it, idx) => ({
      id: randomUUID(),
      invoiceId: id,
      itemType: it.itemType ?? 'product',
      productId: it.productId ?? null,
      name: it.name,
      description: it.description,
      imageUrl: it.imageUrl,
      unit: it.unit,
      quantity: it.quantity,
      unitPriceNet: it.unitPriceNet,
      discountPercent: it.discountPercent,
      vatRate: it.vatRate,
      isOptional: false,
      sortOrder: idx,
      updatedAt: new Date().toISOString(),
    }))
  if (rows.length > 0) {
    const { error: liErr } = await supabase.from('invoice_line_items').insert(rows)
    if (liErr) {
      console.error('[convertQuoteToInvoice] line items error:', liErr)
      return { error: { _form: [`Rechnung angelegt, aber Positionen-Fehler: ${liErr.message}`] } }
    }
  }

  await logActivity({
    entityType: 'quote',
    entityId: id,
    action: 'created',
    summary: `Rechnung ${invoiceNumber} aus Angebot ${quote.quoteNumber} erstellt`,
  })

  revalidatePath('/invoices')
  revalidatePath(`/quotes/${quoteId}`)
  return { redirectTo: `/invoices/${id}` }
}
