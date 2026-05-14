/**
 * Zentrale Logik für Line-Item-Berechnungen.
 * Wird sowohl auf Server (Action) als auch Client (Live-Preview im Editor) genutzt.
 *
 * Regel:
 * - lineSubtotal = quantity × unitPriceNet
 * - lineDiscount = lineSubtotal × discountPercent / 100
 * - lineNet      = lineSubtotal − lineDiscount
 * - lineVat      = lineNet × vatRate / 100
 * - lineGross    = lineNet + lineVat
 *
 * Optionale Positionen werden NICHT in die Quote-Totals einbezogen,
 * aber im PDF mit Markierung angezeigt.
 */

export interface LineItemForCalc {
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
  totalVat: number
  totalGross: number
}

export function calcLine(item: LineItemForCalc): LineCalc {
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

export function calcQuoteTotals(items: LineItemForCalc[]): QuoteTotals {
  let subtotalNet = 0
  let totalDiscount = 0
  let totalVat = 0
  let totalGross = 0
  for (const it of items) {
    if (it.isOptional) continue
    const c = calcLine(it)
    subtotalNet += c.subtotal
    totalDiscount += c.discount
    totalVat += c.vat
    totalGross += c.gross
  }
  return {
    subtotalNet: round2(subtotalNet),
    totalDiscount: round2(totalDiscount),
    totalVat: round2(totalVat),
    totalGross: round2(totalGross),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
