import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  description: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().default('Stück'),
  defaultPriceNet: z.coerce.number().min(0).default(0),
  defaultVatRate: z.coerce.number().refine((v) => v === 19 || v === 7 || v === 0, {
    message: 'MwSt-Satz: 0, 7 oder 19',
  }).default(19),
  imageUrl: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
})

export type ProductInput = z.infer<typeof productSchema>
