import { createClient } from '@/lib/supabase/server'

export interface MilestoneTemplateItem {
  id: string
  templateId: string
  title: string
  description: string | null
  sortOrder: number
}

export interface MilestoneTemplate {
  id: string
  name: string
  description: string | null
  items: MilestoneTemplateItem[]
}

export interface PunchlistTemplateItem {
  id: string
  templateId: string
  title: string
  sortOrder: number
}

export interface PunchlistTemplate {
  id: string
  name: string
  description: string | null
  items: PunchlistTemplateItem[]
}

export interface MaterialTemplateItem {
  id: string
  templateId: string
  title: string
  quantity: number | null
  unit: string | null
  notes: string | null
  sortOrder: number
}

export interface MaterialTemplate {
  id: string
  name: string
  description: string | null
  items: MaterialTemplateItem[]
}

export interface TemplateSet {
  id: string
  name: string
  description: string | null
  milestoneTemplateId: string | null
  punchlistTemplateId: string | null
  materialTemplateId: string | null
  milestoneTemplate: { id: string; name: string } | null
  punchlistTemplate: { id: string; name: string } | null
  materialTemplate: { id: string; name: string } | null
}

export interface TemplateOptions {
  milestones: { id: string; name: string }[]
  punchlists: { id: string; name: string }[]
  materials: { id: string; name: string }[]
  sets: { id: string; name: string }[]
}

export async function getMilestoneTemplates(): Promise<MilestoneTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('milestone_templates')
    .select('id, name, description, items:milestone_template_items(id, templateId, title, description, sortOrder)')
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((t) => ({
    ...t,
    items: ((t.items as MilestoneTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

export async function getMilestoneTemplateById(id: string): Promise<MilestoneTemplate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('milestone_templates')
    .select('id, name, description, items:milestone_template_items(id, templateId, title, description, sortOrder)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    items: ((data.items as MilestoneTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

export async function getPunchlistTemplates(): Promise<PunchlistTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('punchlist_templates')
    .select('id, name, description, items:punchlist_template_items(id, templateId, title, sortOrder)')
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((t) => ({
    ...t,
    items: ((t.items as PunchlistTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

export async function getPunchlistTemplateById(id: string): Promise<PunchlistTemplate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('punchlist_templates')
    .select('id, name, description, items:punchlist_template_items(id, templateId, title, sortOrder)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    items: ((data.items as PunchlistTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

export async function getMaterialTemplates(): Promise<MaterialTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('material_templates')
    .select('id, name, description, items:material_template_items(id, templateId, title, quantity, unit, notes, sortOrder)')
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((t) => ({
    ...t,
    items: ((t.items as MaterialTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

export async function getMaterialTemplateById(id: string): Promise<MaterialTemplate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('material_templates')
    .select('id, name, description, items:material_template_items(id, templateId, title, quantity, unit, notes, sortOrder)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    items: ((data.items as MaterialTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

export async function getTemplateSets(): Promise<TemplateSet[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('template_sets')
    .select(`id, name, description, milestoneTemplateId, punchlistTemplateId, materialTemplateId,
      milestoneTemplate:milestone_templates(id, name),
      punchlistTemplate:punchlist_templates(id, name),
      materialTemplate:material_templates(id, name)`)
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any
}

export async function getTemplateOptions(): Promise<TemplateOptions> {
  const supabase = await createClient()
  const [mRes, pRes, matRes, sRes] = await Promise.all([
    supabase.from('milestone_templates').select('id, name').order('name'),
    supabase.from('punchlist_templates').select('id, name').order('name'),
    supabase.from('material_templates').select('id, name').order('name'),
    supabase.from('template_sets').select('id, name').order('name'),
  ])
  return {
    milestones: mRes.data ?? [],
    punchlists: pRes.data ?? [],
    materials: matRes.data ?? [],
    sets: sRes.data ?? [],
  }
}
