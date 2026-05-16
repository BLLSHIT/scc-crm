import { z } from 'zod'

export const templateNameSchema = z.object({
  name: z.string().min(1, 'Name erforderlich').max(100),
  description: z.string().max(300).optional(),
})
export type TemplateNameInput = z.infer<typeof templateNameSchema>

export const milestoneTemplateItemSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich').max(200),
  description: z.string().max(500).optional(),
})
export type MilestoneTemplateItemInput = z.infer<typeof milestoneTemplateItemSchema>

export const punchlistTemplateItemSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich').max(200),
})
export type PunchlistTemplateItemInput = z.infer<typeof punchlistTemplateItemSchema>

export const materialTemplateItemSchema = z.object({
  title: z.string().min(1, 'Bezeichnung erforderlich').max(200),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().max(20).optional(),
  notes: z.string().max(300).optional(),
})
export type MaterialTemplateItemInput = z.infer<typeof materialTemplateItemSchema>

export const templateSetSchema = z.object({
  name: z.string().min(1, 'Name erforderlich').max(100),
  description: z.string().max(300).optional(),
  milestoneTemplateId: z.string().optional(),
  punchlistTemplateId: z.string().optional(),
  materialTemplateId: z.string().optional(),
})
export type TemplateSetInput = z.infer<typeof templateSetSchema>

export const importTemplateSchema = z.object({
  milestoneTemplateId: z.string().optional(),
  punchlistTemplateId: z.string().optional(),
  materialTemplateId: z.string().optional(),
  mode: z.enum(['replace', 'append']),
})
export type ImportTemplateInput = z.infer<typeof importTemplateSchema>
