import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich'),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'done']).default('open'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
})

export type TaskInput = z.infer<typeof taskSchema>
