import { z } from 'zod'

export const buildTeamSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  description: z.string().optional(),
  maxConcurrentProjects: z.coerce.number().int().min(1).max(20).default(2),
  isActive: z.coerce.boolean().default(true),
  notes: z.string().optional(),
})

export type BuildTeamInput = z.infer<typeof buildTeamSchema>

export const buildTeamMemberSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  isExternal: z.coerce.boolean().default(false),
  companyName: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
})

export type BuildTeamMemberInput = z.infer<typeof buildTeamMemberSchema>
