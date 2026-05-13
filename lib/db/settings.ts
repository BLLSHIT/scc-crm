import { createClient } from '@/lib/supabase/server'

export async function getSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'singleton')
    .single()
  if (error) {
    console.error('[getSettings] error:', error)
    throw new Error(error.message)
  }
  return data
}

/**
 * Atomically reserves the next quote/invoice number for the current year.
 * Resets the sequence if the year has changed.
 * Returns the formatted number like "RE-2026-0001".
 */
export async function getNextDocumentNumber(kind: 'quote' | 'invoice') {
  const supabase = await createClient()
  const current = await getSettings()
  const year = new Date().getFullYear()
  const isQuote = kind === 'quote'
  const prefix = isQuote ? current.quoteNumberPrefix : current.invoiceNumberPrefix
  const seqField = isQuote ? 'nextQuoteSeq' : 'nextInvoiceSeq'

  // Reset sequence if year changed
  let nextSeq: number
  if (current.currentYear !== year) {
    nextSeq = 1
    const { error } = await supabase
      .from('settings')
      .update({
        [seqField]: 2,
        currentYear: year,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', 'singleton')
    if (error) {
      console.error('[getNextDocumentNumber] year-reset error:', error)
      throw new Error(error.message)
    }
  } else {
    nextSeq = current[seqField] as number
    const { error } = await supabase
      .from('settings')
      .update({
        [seqField]: nextSeq + 1,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', 'singleton')
    if (error) {
      console.error('[getNextDocumentNumber] increment error:', error)
      throw new Error(error.message)
    }
  }

  const padded = String(nextSeq).padStart(4, '0')
  return `${prefix}-${year}-${padded}`
}
