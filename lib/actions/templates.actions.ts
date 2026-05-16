'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTemplateOptions } from '@/lib/db/templates'
import {
  templateNameSchema, milestoneTemplateItemSchema, punchlistTemplateItemSchema,
  materialTemplateItemSchema, templateSetSchema, importTemplateSchema,
  type TemplateNameInput, type MilestoneTemplateItemInput, type PunchlistTemplateItemInput,
  type MaterialTemplateItemInput, type TemplateSetInput, type ImportTemplateInput,
} from '@/lib/validations/template.schema'

export type ActionResult = { error?: Record<string, string[]>; redirectTo?: string }

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// ─── Meilenstein-Vorlagen ─────────────────────────────────────────────────────

export async function createMilestoneTemplate(input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const id = randomUUID()
  const { error } = await supabase.from('milestone_templates').insert({
    id, name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/meilenstein-vorlagen')
  return { redirectTo: `/stammdaten/meilenstein-vorlagen/${id}` }
}

export async function updateMilestoneTemplate(id: string, input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('milestone_templates').update({
    name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/meilenstein-vorlagen')
  revalidatePath(`/stammdaten/meilenstein-vorlagen/${id}`)
  return {}
}

export async function deleteMilestoneTemplate(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('milestone_templates').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/meilenstein-vorlagen')
  return { redirectTo: '/stammdaten/meilenstein-vorlagen' }
}

export async function addMilestoneTemplateItem(templateId: string, input: MilestoneTemplateItemInput): Promise<ActionResult> {
  const parsed = milestoneTemplateItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: existing } = await supabase
    .from('milestone_template_items').select('sortOrder').eq('templateId', templateId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1
  const { error } = await supabase.from('milestone_template_items').insert({
    id: randomUUID(), templateId,
    title: parsed.data.title.trim(),
    description: parsed.data.description?.trim() || null,
    sortOrder: nextSort,
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/meilenstein-vorlagen/${templateId}`)
  return {}
}

export async function deleteMilestoneTemplateItem(itemId: string, templateId: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('milestone_template_items').delete().eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/meilenstein-vorlagen/${templateId}`)
  return {}
}

// ─── Checklisten-Vorlagen ─────────────────────────────────────────────────────

export async function createPunchlistTemplate(input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const id = randomUUID()
  const { error } = await supabase.from('punchlist_templates').insert({
    id, name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/checklisten-vorlagen')
  return { redirectTo: `/stammdaten/checklisten-vorlagen/${id}` }
}

export async function updatePunchlistTemplate(id: string, input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('punchlist_templates').update({
    name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/checklisten-vorlagen')
  revalidatePath(`/stammdaten/checklisten-vorlagen/${id}`)
  return {}
}

export async function deletePunchlistTemplate(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('punchlist_templates').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/checklisten-vorlagen')
  return { redirectTo: '/stammdaten/checklisten-vorlagen' }
}

export async function addPunchlistTemplateItem(templateId: string, input: PunchlistTemplateItemInput): Promise<ActionResult> {
  const parsed = punchlistTemplateItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: existing } = await supabase
    .from('punchlist_template_items').select('sortOrder').eq('templateId', templateId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1
  const { error } = await supabase.from('punchlist_template_items').insert({
    id: randomUUID(), templateId, title: parsed.data.title.trim(), sortOrder: nextSort,
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/checklisten-vorlagen/${templateId}`)
  return {}
}

export async function deletePunchlistTemplateItem(itemId: string, templateId: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('punchlist_template_items').delete().eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/checklisten-vorlagen/${templateId}`)
  return {}
}

// ─── Material-Vorlagen ────────────────────────────────────────────────────────

export async function createMaterialTemplate(input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const id = randomUUID()
  const { error } = await supabase.from('material_templates').insert({
    id, name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/material-vorlagen')
  return { redirectTo: `/stammdaten/material-vorlagen/${id}` }
}

export async function updateMaterialTemplate(id: string, input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('material_templates').update({
    name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/material-vorlagen')
  revalidatePath(`/stammdaten/material-vorlagen/${id}`)
  return {}
}

export async function deleteMaterialTemplate(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('material_templates').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/material-vorlagen')
  return { redirectTo: '/stammdaten/material-vorlagen' }
}

export async function addMaterialTemplateItem(templateId: string, input: MaterialTemplateItemInput): Promise<ActionResult> {
  const parsed = materialTemplateItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: existing } = await supabase
    .from('material_template_items').select('sortOrder').eq('templateId', templateId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1
  const { error } = await supabase.from('material_template_items').insert({
    id: randomUUID(), templateId,
    title: parsed.data.title.trim(),
    quantity: parsed.data.quantity ?? null,
    unit: parsed.data.unit?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
    sortOrder: nextSort,
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/material-vorlagen/${templateId}`)
  return {}
}

export async function deleteMaterialTemplateItem(itemId: string, templateId: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('material_template_items').delete().eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/material-vorlagen/${templateId}`)
  return {}
}

// ─── Vorlagen-Sets ────────────────────────────────────────────────────────────

export async function createTemplateSet(input: TemplateSetInput): Promise<ActionResult> {
  const parsed = templateSetSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('template_sets').insert({
    id: randomUUID(),
    name: parsed.data.name.trim(),
    description: parsed.data.description?.trim() || null,
    milestoneTemplateId: parsed.data.milestoneTemplateId || null,
    punchlistTemplateId: parsed.data.punchlistTemplateId || null,
    materialTemplateId: parsed.data.materialTemplateId || null,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/vorlagen-sets')
  return {}
}

export async function updateTemplateSet(id: string, input: TemplateSetInput): Promise<ActionResult> {
  const parsed = templateSetSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('template_sets').update({
    name: parsed.data.name.trim(),
    description: parsed.data.description?.trim() || null,
    milestoneTemplateId: parsed.data.milestoneTemplateId || null,
    punchlistTemplateId: parsed.data.punchlistTemplateId || null,
    materialTemplateId: parsed.data.materialTemplateId || null,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/vorlagen-sets')
  return {}
}

export async function deleteTemplateSet(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('template_sets').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/vorlagen-sets')
  return {}
}

// ─── Template Options (für Import-Modal) ──────────────────────────────────────

export async function fetchTemplateOptions() {
  const { user } = await getUser()
  if (!user) return null
  return getTemplateOptions()
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importTemplate(projectId: string, input: ImportTemplateInput): Promise<ActionResult> {
  const parsed = importTemplateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }

  const { milestoneTemplateId, punchlistTemplateId, materialTemplateId, mode } = parsed.data

  async function getNextSort(table: string): Promise<number> {
    const { data } = await supabase
      .from(table).select('sortOrder').eq('projectId', projectId)
      .order('sortOrder', { ascending: false }).limit(1)
    return (data?.[0]?.sortOrder ?? -1) + 1
  }

  if (milestoneTemplateId) {
    if (mode === 'replace') {
      await supabase.from('project_milestones').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('milestone_template_items').select('title, description, sortOrder')
      .eq('templateId', milestoneTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = mode === 'append' ? await getNextSort('project_milestones') : 0
      await supabase.from('project_milestones').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId,
          title: item.title, description: item.description || null,
          sortOrder: offset + idx,
          updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  if (punchlistTemplateId) {
    if (mode === 'replace') {
      await supabase.from('project_punch_items').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('punchlist_template_items').select('title, sortOrder')
      .eq('templateId', punchlistTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = mode === 'append' ? await getNextSort('project_punch_items') : 0
      await supabase.from('project_punch_items').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId,
          title: item.title,
          sortOrder: offset + idx,
          updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  if (materialTemplateId) {
    if (mode === 'replace') {
      await supabase.from('project_material_items').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('material_template_items').select('title, quantity, unit, notes, sortOrder')
      .eq('templateId', materialTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = mode === 'append' ? await getNextSort('project_material_items') : 0
      await supabase.from('project_material_items').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId,
          title: item.title,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          notes: item.notes ?? null,
          sortOrder: offset + idx,
          updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return {}
}
