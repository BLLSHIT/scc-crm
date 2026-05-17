'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  projectSchema, milestoneSchema, punchItemSchema, materialItemSchema,
  type ProjectInput, type MilestoneInput, type PunchItemInput, type MaterialItemInput,
} from '@/lib/validations/project.schema'
import { logActivity } from '@/lib/db/activity-logs'
import type { ProjectStatus } from '@/lib/db/projects'
import { runWorkflows } from '@/lib/workflows/engine'

export type ActionResult = { error?: Record<string, string[]>; redirectTo?: string }

function clean(input: ProjectInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    dealId: input.dealId || null,
    companyId: input.companyId || null,
    contactId: input.contactId || null,
    teamMemberId: input.teamMemberId || null,
    buildTeamId: input.buildTeamId || null,
    startDate: input.startDate || null,
    plannedEndDate: input.plannedEndDate || null,
    actualEndDate: input.actualEndDate || null,
    locationStreet: input.locationStreet?.trim() || null,
    locationZip: input.locationZip?.trim() || null,
    locationCity: input.locationCity?.trim() || null,
    locationCountry: input.locationCountry?.trim() || null,
    notes: input.notes?.trim() || null,
  }
}

export async function createProject(input: ProjectInput): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const id = randomUUID()
  const { error } = await supabase.from('projects').insert({
    id,
    ...clean(parsed.data),
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[createProject] error:', error)
    return { error: { _form: [error.message] } }
  }
  await logActivity({
    entityType: 'deal',
    entityId: parsed.data.dealId || id,
    action: 'created',
    summary: `Projekt „${parsed.data.name}" angelegt`,
  })
  revalidatePath('/projects')
  return { redirectTo: `/projects/${id}` }
}

export async function updateProject(id: string, input: ProjectInput): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase
    .from('projects')
    .update({ ...clean(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  return { redirectTo: `/projects/${id}` }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/projects')
  redirect('/projects')
}

export async function updateProjectStatus(id: string, newStatus: ProjectStatus): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }

  const { data: projectData } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .single()

  const patch: Record<string, unknown> = { status: newStatus, updatedAt: new Date().toISOString() }
  if (newStatus === 'completed') patch.actualEndDate = new Date().toISOString()
  const { error } = await supabase.from('projects').update(patch).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  try {
    await logActivity({
      entityType: 'project',
      entityId: id,
      action: 'status_changed',
      summary: `Status → ${newStatus}`,
      metadata: { newStatus },
    })
  } catch (logErr) {
    console.warn('[updateProjectStatus] logActivity failed:', logErr)
  }
  try {
    await runWorkflows('project_status_changed', {
      projectId: id,
      status: newStatus,
      projectName: projectData?.name,
    })
  } catch (err) {
    console.error('[workflow] project_status_changed failed:', err)
  }
  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  return {}
}

/**
 * Konvertiert einen (gewonnenen) Deal in ein neues Projekt.
 * Übernimmt: Titel/Firma/Ansprechpartner/SCC-Bearbeiter aus Deal.
 */
export async function convertDealToProject(dealId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: deal, error: dErr } = await supabase
    .from('deals')
    .select('id, title, companyId, ownerId, teamMemberId, description')
    .eq('id', dealId)
    .single()
  if (dErr || !deal) return { error: { _form: ['Deal nicht gefunden.'] } }

  const id = randomUUID()
  const { error } = await supabase.from('projects').insert({
    id,
    name: deal.title ?? 'Neues Projekt',
    description: deal.description ?? null,
    status: 'planning',
    dealId: deal.id,
    companyId: deal.companyId ?? null,
    teamMemberId: deal.teamMemberId ?? null,
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[convertDealToProject] error:', error)
    return { error: { _form: [error.message] } }
  }

  // Auto-Setup: Standard-Meilensteine für Padel-Court
  const defaultMilestones = [
    { title: 'Standortprüfung', sortOrder: 0 },
    { title: 'Genehmigung eingeholt', sortOrder: 1 },
    { title: 'Material bestellt', sortOrder: 2 },
    { title: 'Aushub / Untergrund vorbereitet', sortOrder: 3 },
    { title: 'Court-Konstruktion installiert', sortOrder: 4 },
    { title: 'Belag verlegt', sortOrder: 5 },
    { title: 'Beleuchtung montiert', sortOrder: 6 },
    { title: 'Übergabe an Kunden', sortOrder: 7 },
  ]
  const milestoneRows = defaultMilestones.map((m) => ({
    id: randomUUID(),
    projectId: id,
    title: m.title,
    sortOrder: m.sortOrder,
    updatedAt: new Date().toISOString(),
  }))
  await supabase.from('project_milestones').insert(milestoneRows)

  await logActivity({
    entityType: 'deal',
    entityId: deal.id,
    action: 'created',
    summary: `Projekt „${deal.title}" aus Deal erstellt`,
  })

  revalidatePath('/projects')
  revalidatePath(`/deals/${deal.id}`)
  return { redirectTo: `/projects/${id}` }
}

// ─── Milestones ────────────────────────────────────────────────────

export async function addMilestone(projectId: string, input: MilestoneInput): Promise<ActionResult> {
  const parsed = milestoneSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }

  // sortOrder ans Ende
  const { data: existing } = await supabase
    .from('project_milestones').select('sortOrder').eq('projectId', projectId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1

  const { error } = await supabase.from('project_milestones').insert({
    id: randomUUID(),
    projectId,
    title: parsed.data.title.trim(),
    description: parsed.data.description?.trim() || null,
    startDate: parsed.data.startDate || null,
    dueDate: parsed.data.dueDate || null,
    sortOrder: nextSort,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function toggleMilestone(milestoneId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_milestones').select('id, projectId, completedAt').eq('id', milestoneId).single()
  if (!row) return { error: { _form: ['Meilenstein nicht gefunden.'] } }
  const newVal = row.completedAt ? null : new Date().toISOString()
  const { error } = await supabase
    .from('project_milestones')
    .update({ completedAt: newVal, updatedAt: new Date().toISOString() })
    .eq('id', milestoneId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${row.projectId}`)
  return {}
}

export async function deleteMilestone(milestoneId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_milestones').select('projectId').eq('id', milestoneId).single()
  const { error } = await supabase.from('project_milestones').delete().eq('id', milestoneId)
  if (error) return { error: { _form: [error.message] } }
  if (row?.projectId) revalidatePath(`/projects/${row.projectId}`)
  return {}
}

export async function updateMilestoneDates(
  milestoneId: string,
  startDate: string | null,
  dueDate: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_milestones').select('projectId').eq('id', milestoneId).single()
  if (!row) return { error: { _form: ['Meilenstein nicht gefunden.'] } }
  const { error } = await supabase
    .from('project_milestones')
    .update({ startDate: startDate || null, dueDate, updatedAt: new Date().toISOString() })
    .eq('id', milestoneId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${row.projectId}`)
  return {}
}

// ─── Attachments ─────────────────────────────────────────────────

export async function recordProjectAttachment(input: {
  projectId: string
  filename: string
  storagePath: string
  fileSize: number
  mimeType: string
  category: string
}): Promise<{ error?: string; attachment?: unknown }> {
  if (!input.projectId || !input.storagePath || !input.filename) {
    return { error: 'Pflichtfelder fehlen.' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }
  let userName: string | null = null
  const { data: p } = await supabase.from('profiles')
    .select('firstName, lastName, email').eq('id', user.id).single()
  if (p) userName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email
  const id = randomUUID()
  const { error } = await supabase.from('project_attachments').insert({
    id,
    projectId: input.projectId,
    filename: input.filename,
    storagePath: input.storagePath,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    category: input.category,
    uploadedBy: user.id,
    uploadedByName: userName,
  })
  if (error) return { error: error.message }
  revalidatePath(`/projects/${input.projectId}`)
  return {
    attachment: {
      id, filename: input.filename, storagePath: input.storagePath,
      category: input.category, fileSize: input.fileSize, mimeType: input.mimeType,
    },
  }
}

export async function deleteProjectAttachment(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }
  const { data: row } = await supabase
    .from('project_attachments').select('id, projectId, filename, storagePath').eq('id', id).single()
  if (!row) return { error: 'Anhang nicht gefunden.' }
  await supabase.storage.from('project-attachments').remove([row.storagePath])
  const { error } = await supabase.from('project_attachments').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${row.projectId}`)
  return {}
}

// ─── Share-Token ─────────────────────────────────────────────────────────────

export async function generateShareToken(projectId: string): Promise<{ token?: string; password?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }
  const token = randomUUID()
  const password = Math.random().toString(36).substring(2, 8).toUpperCase()
  const { error } = await supabase.from('projects')
    .update({ shareToken: token, shareLinkPassword: password, updatedAt: new Date().toISOString() })
    .eq('id', projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { token, password }
}

export async function revokeShareToken(projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('projects')
    .update({ shareToken: null, shareLinkPassword: null, updatedAt: new Date().toISOString() })
    .eq('id', projectId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

// ─── Punch-List (Abnahme-Checkliste) ────────────────────────────────────────

export async function addPunchItem(projectId: string, input: PunchItemInput): Promise<ActionResult> {
  const parsed = punchItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: existing } = await supabase
    .from('project_punch_items').select('sortOrder').eq('projectId', projectId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1
  const { error } = await supabase.from('project_punch_items').insert({
    id: randomUUID(),
    projectId,
    title: parsed.data.title.trim(),
    sortOrder: nextSort,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function togglePunchItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_punch_items').select('id, projectId, isDone').eq('id', itemId).single()
  if (!row) return { error: { _form: ['Eintrag nicht gefunden.'] } }
  const isDone = !row.isDone
  const { error } = await supabase.from('project_punch_items').update({
    isDone,
    doneAt: isDone ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }).eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${row.projectId}`)
  return {}
}

export async function deletePunchItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_punch_items').select('projectId').eq('id', itemId).single()
  const { error } = await supabase.from('project_punch_items').delete().eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  if (row?.projectId) revalidatePath(`/projects/${row.projectId}`)
  return {}
}

// ─── Material-Checklist ──────────────────────────────────────────────────────

export async function addMaterialItem(projectId: string, input: MaterialItemInput): Promise<ActionResult> {
  const parsed = materialItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: existing } = await supabase
    .from('project_material_items').select('sortOrder').eq('projectId', projectId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1
  const { error } = await supabase.from('project_material_items').insert({
    id: randomUUID(),
    projectId,
    title: parsed.data.title.trim(),
    quantity: parsed.data.quantity ?? null,
    unit: parsed.data.unit?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
    sortOrder: nextSort,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function toggleMaterialOrdered(itemId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_material_items').select('projectId, isOrdered').eq('id', itemId).single()
  if (!row) return { error: { _form: ['Eintrag nicht gefunden.'] } }
  const { error } = await supabase.from('project_material_items').update({
    isOrdered: !row.isOrdered,
    updatedAt: new Date().toISOString(),
  }).eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${row.projectId}`)
  return {}
}

export async function toggleMaterialArrived(itemId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_material_items').select('projectId, isArrived').eq('id', itemId).single()
  if (!row) return { error: { _form: ['Eintrag nicht gefunden.'] } }
  const { error } = await supabase.from('project_material_items').update({
    isArrived: !row.isArrived,
    updatedAt: new Date().toISOString(),
  }).eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${row.projectId}`)
  return {}
}

export async function deleteMaterialItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_material_items').select('projectId').eq('id', itemId).single()
  const { error } = await supabase.from('project_material_items').delete().eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  if (row?.projectId) revalidatePath(`/projects/${row.projectId}`)
  return {}
}
