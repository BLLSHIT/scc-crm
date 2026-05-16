import { z } from 'zod'

export const teamMemberSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  email: z.string().email('Ungültige E-Mail'),
  mobile: z.string().optional(),
  position: z.string().optional(),
  abbreviation: z.string().max(10).optional(),
  isActive: z.coerce.boolean().default(true),
})

export type TeamMemberInput = z.infer<typeof teamMemberSchema>
