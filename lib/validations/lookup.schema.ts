import { z } from 'zod'

/** Geteiltes Schema für simple Lookup-Tabellen (Branche, Lead-Quelle, ...) */
export const lookupSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
})

export type LookupInput = z.infer<typeof lookupSchema>
