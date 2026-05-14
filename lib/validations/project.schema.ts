import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  description: z.string().optional(),
  status: z.enum(['planning', 'ordered', 'installation', 'completed', 'on_hold', 'cancelled']).default('planning'),

  dealId: z.string().optional(),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  teamMemberId: z.string().optional(),

  startDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualEndDate: z.string().optional(),

  locationStreet: z.string().optional(),
  locationZip: z.string().optional(),
  locationCity: z.string().optional(),
  locationCountry: z.string().optional(),

  notes: z.string().optional(),
})

export type ProjectInput = z.infer<typeof projectSchema>

export const milestoneSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
})

export type MilestoneInput = z.infer<typeof milestoneSchema>
