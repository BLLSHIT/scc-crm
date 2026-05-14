/**
 * Zentrale Logik für Line-Item-Berechnungen.
 * Wird sowohl auf Server (Action) als auch Client (Live-Preview im Editor) genutzt.
 *
 * Regel pro Position:
 *   lineSubtotal = quantity × unitPriceNet
 *   lineDiscount = lineSubtotal × discountPercent / 100
 *   lineNet      = lineSubtotal − lineDiscount
 *   lineVat      = lineNet × vatRate / 100
 *   lineGross    = lineNet + lineVat
 *
 * Optionale Positionen werden NICHT in die Quote-Totals einbezogen.
 * Freitextzeilen (itemType='text') werden komplett ignoriert in den Calcs.
 *
 * Gesamtrabatt (globalDiscountPercent) reduziert den Netto-Subtotal
 * proportional über alle VAT-Sätze hinweg.
 */

export interface LineItemForCalc {
  itemType?: 'product' | 'text'
  quantity: number | string
  unitPriceNet: number | string
  discountPercent: number | string
  vatRate: number | string
  isOptional: boolean
}

export interface LineCalc {
  subtotal: number
  discount: number
  net: number
  vat: number
  gross: number
}

export interface QuoteTotals {
  subtotalNet: number
  totalDiscount: number
  globalDiscountAmount: number
  totalVat: number
  totalGross: number
}

export function calcLine(item: LineItemForCalc): LineCalc {
  if (item.itemType === 'text') {
    return { subtotal: 0, discount: 0, net: 0, vat: 0, gross: 0 }
  }
  const qty = Number(item.quantity) || 0
  const price = Number(item.unitPriceNet) || 0
  const disc = Number(item.discountPercent) || 0
  const vat = Number(item.vatRate) || 0

  const subtotal = qty * price
  const discount = subtotal * (disc / 100)
  const net = subtotal - discount
  const vatAmount = net * (vat / 100)
  const gross = net + vatAmount

  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    net: round2(net),
    vat: round2(vatAmount),
    gross: round2(gross),
  }
}

export function calcQuoteTotals(
  items: LineItemForCalc[],
  globalDiscountPercent = 0
): QuoteTotals {
  let subtotalNetBeforeGlobal = 0
  let totalLineDiscount = 0
  let totalVatBeforeGlobal = 0
  for (const it of items) {
    if (it.itemType === 'text') continue
    if (it.isOptional) continue
    const c = calcLine(it)
    subtotalNetBeforeGlobal += c.net
    totalLineDiscount += c.discount
    totalVatBeforeGlobal += c.vat
  }

  const gPct = Math.max(0, Math.min(100, Number(globalDiscountPercent) || 0))
  const factor = (100 - gPct) / 100
  const globalDiscountAmount = subtotalNetBeforeGlobal * (gPct / 100)
  const totalNet = subtotalNetBeforeGlobal - globalDiscountAmount
  const totalVat = totalVatBeforeGlobal * factor
  const totalGross = totalNet + totalVat

  return {
    subtotalNet: round2(subtotalNetBeforeGlobal),
    totalDiscount: round2(totalLineDiscount),
    globalDiscountAmount: round2(globalDiscountAmount),
    totalVat: round2(totalVat),
    totalGross: round2(totalGross),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
