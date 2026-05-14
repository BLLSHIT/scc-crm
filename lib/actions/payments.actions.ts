'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { paymentSchema, type PaymentInput } from '@/lib/validations/invoice.schema'
import { logActivity } from '@/lib/db/activity-logs'

export type ActionResult = { error?: Record<string, string[]>; success?: boolean }

/**
 * Erfasst eine Zahlung für eine Rechnung. Wenn der gesamte Brutto-Betrag erreicht ist,
 * wird die Rechnung automatisch auf "paid" gesetzt.
 */
export async function recordPayment(invoiceId: string, input: PaymentInput): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let userName: string | null = null
  if (user) {
    const { data: p } = await supabase
      .from('profiles').select('firstName, lastName, email').eq('id', user.id).single()
    if (p) userName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email
  }

  // 1) Zahlung einfügen
  const { error: insErr } = await supabase.from('payments').insert({
    id: randomUUID(),
    invoiceId,
    amount: parsed.data.amount,
    paymentDate: parsed.data.paymentDate,
    paymentMethod: parsed.data.paymentMethod?.trim() || null,
    reference: parsed.data.reference?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
    recordedBy: user?.id ?? null,
    recordedByName: userName,
    updatedAt: new Date().toISOString(),
  })
  if (insErr) {
    console.error('[recordPayment] insert error:', insErr)
    return { error: { _form: [insErr.message] } }
  }

  // 2) Total-Paid neu berechnen
  const { data: payments } = await supabase
    .from('payments').select('amount').eq('invoiceId', invoiceId)
  const totalPaid = (payments ?? []).reduce(
    (s: number, p: { amount: number | string }) => s + Number(p.amount ?? 0),
    0
  )

  // 3) Rechnungsbetrag holen
  const { data: invoice } = await supabase
    .from('invoices').select('totalGross, status').eq('id', invoiceId).single()
  const totalGross = Number(invoice?.totalGross ?? 0)
  const isFullyPaid = totalPaid >= totalGross && totalGross > 0

  // 4) Rechnung aktualisieren (totalPaid + ggf. Status auf paid)
  const patch: Record<string, unknown> = {
    totalPaid,
    updatedAt: new Date().toISOString(),
  }
  if (isFullyPaid && invoice?.status !== 'paid') {
    patch.status = 'paid'
    patch.paidAt = new Date().toISOString()
  }
  await supabase.from('invoices').update(patch).eq('id', invoiceId)

  await logActivity({
    entityType: 'quote',
    entityId: invoiceId,
    action: 'updated',
    summary: `Zahlung erfasst: ${parsed.data.amount.toFixed(2)} €${
      parsed.data.paymentMethod ? ` (${parsed.data.paymentMethod})` : ''
    }${isFullyPaid ? ' → vollständig bezahlt' : ''}`,
  })

  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  return { success: true }
}

export async function deletePayment(paymentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('payments').select('invoiceId, amount').eq('id', paymentId).single()
  if (!row) return { error: { _form: ['Zahlung nicht gefunden.'] } }

  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) return { error: { _form: [error.message] } }

  // total neu berechnen
  const { data: payments } = await supabase
    .from('payments').select('amount').eq('invoiceId', row.invoiceId)
  const totalPaid = (payments ?? []).reduce(
    (s: number, p: { amount: number | string }) => s + Number(p.amount ?? 0),
    0
  )
  const { data: invoice } = await supabase
    .from('invoices').select('totalGross, status').eq('id', row.invoiceId).single()
  const totalGross = Number(invoice?.totalGross ?? 0)

  const patch: Record<string, unknown> = {
    totalPaid,
    updatedAt: new Date().toISOString(),
  }
  // Wenn Status 'paid' war und nun nicht mehr ausgeglichen → auf 'open'
  if (invoice?.status === 'paid' && totalPaid < totalGross) {
    patch.status = 'open'
    patch.paidAt = null
  }
  await supabase.from('invoices').update(patch).eq('id', row.invoiceId)

  revalidatePath(`/invoices/${row.invoiceId}`)
  return { success: true }
}
