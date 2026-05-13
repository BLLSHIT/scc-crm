import { z } from 'zod'

export const companySchema = z.object({
  name: z.string().min(1, 'Firmenname erforderlich'),
  website: z.string().url('Ungültige URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  size: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
})

export type CompanyInput = z.infer<typeof companySchema>
