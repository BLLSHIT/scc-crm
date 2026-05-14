import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
})

export type CategoryInput = z.infer<typeof categorySchema>
