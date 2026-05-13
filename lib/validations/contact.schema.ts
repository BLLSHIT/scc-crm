import { z } from 'zod'

export const contactSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  phone: z.string().optional(),
  position: z.string().optional(),
  source: z.string().optional(),
  companyId: z.string().optional(),
  ownerId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

export type ContactInput = z.infer<typeof contactSchema>
