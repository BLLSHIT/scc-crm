import { z } from 'zod'

export const quoteLineItemSchema = z.object({
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

export type QuoteLineItemInput = z.infer<typeof quoteLineItemSchema>

export const quoteSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich'),
  validUntil: z.string().min(1, 'Gültigkeitsdatum erforderlich'),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  teamMemberId: z.string().optional(),
  dealId: z.string().optional(),
  greeting: z.string().optional(),
  intro: z.string().optional(),
  footer: z.string().optional(),
  paymentTerms: z.string().optional(),
  globalDiscountPercent: z.coerce.number().min(0).max(100).default(0),
  lineItems: z.array(quoteLineItemSchema).default([]),
})

export type QuoteInput = z.infer<typeof quoteSchema>
