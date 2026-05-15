import { z } from 'zod'

export const dealSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich'),
  value: z.coerce.number().min(0).default(0),
  currency: z.string().default('EUR'),
  probability: z.coerce.number().min(0).max(100).default(0),
  expectedCloseAt: z.string().optional(),
  description: z.string().optional(),
  stageId: z.string().min(1, 'Phase erforderlich'),
  pipelineId: z.string().min(1, 'Pipeline erforderlich'),
  companyId: z.string().optional(),
  ownerId: z.string().optional(),
  teamMemberId: z.string().optional(),
  projectStatus: z.enum([
    'none',
    'planning',
    'in_progress',
    'installed',
    'completed',
    'paid',
    'on_hold',
    'cancelled',
  ]).optional(),
  locationStreet: z.string().optional(),
  locationZip: z.string().optional(),
  locationCity: z.string().optional(),
  locationCountry: z.string().optional(),
  plannedDelivery: z.string().optional(),
})

export type DealInput = z.infer<typeof dealSchema>
