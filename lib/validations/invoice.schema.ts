import { z } from 'zod'

export const invoiceLineItemSchema = z.object({
  itemType: z.enum(['product', 'text']).default('product'),
  productId: z.string().optional(),
  name: z.string().min(1, 'Bezeichnung erforderlich'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  unit: z.string().default('Stück'),
  quantity: z.coerce.number().min(0).default(1),
  unitPriceNet: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(19),
  isOptional: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
})

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>

export const invoiceSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich'),
  issueDate: z.string().min(1, 'Rechnungsdatum erforderlich'),
  dueDate: z.string().min(1, 'Fälligkeitsdatum erforderlich'),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  teamMemberId: z.string().optional(),
  dealId: z.string().optional(),
  quoteId: z.string().optional(),
  greeting: z.string().optional(),
  intro: z.string().optional(),
  footer: z.string().optional(),
  paymentTerms: z.string().optional(),
  globalDiscountPercent: z.coerce.number().min(0).max(100).default(0),
  lineItems: z.array(invoiceLineItemSchema).default([]),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>

export const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Betrag erforderlich'),
  paymentDate: z.string().min(1, 'Datum erforderlich'),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export type PaymentInput = z.infer<typeof paymentSchema>
