import { z } from 'zod'

export const textModuleSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  type: z.enum(['greeting', 'intro', 'footer', 'payment_terms', 'other']),
  content: z.string().min(1, 'Inhalt erforderlich'),
  isDefault: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
})

export type TextModuleInput = z.infer<typeof textModuleSchema>
