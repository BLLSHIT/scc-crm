// lib/actions/acceptance-protocol.actions.ts
'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { error?: string }

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/protocol`)
  revalidatePath(`/projects/${projectId}`)
}

// ── Phase CRUD ───────────────────────────────────────────────────────────────

export async function addPhase(
  protocolId: string,
  projectId: string,
  name: string
): Promise<ActionResult> {
  if (!name.trim()) return { error: 'Name ist Pflicht.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { data: existing } = await supabase
    .from('acceptance_phases')
    .select('sortOrder')
    .eq('protocolId', protocolId)
    .order('sortOrder', { ascending: false })
    .limit(1)
  const nextOrder = existing?.[0] ? (existing[0] as any).sortOrder + 1 : 0

  const { error } = await supabase.from('acceptance_phases').insert({
    id: randomUUID(),
    protocolId,
    name: name.trim(),
    sortOrder: nextOrder,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function deletePhase(phaseId: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { data: phase } = await supabase
    .from('acceptance_phases')
    .select('completedAt')
    .eq('id', phaseId)
    .single()
  if (phase?.completedAt) return { error: 'Abgeschlossene Phasen können nicht gelöscht werden.' }

  const { error } = await supabase.from('acceptance_phases').delete().eq('id', phaseId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function reorderPhases(
  protocolId: string,
  projectId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const results = await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('acceptance_phases').update({ sortOrder: idx, updatedAt: new Date().toISOString() }).eq('id', id)
    )
  )
  const firstError = results.find((r) => r.error)
  if (firstError?.error) return { error: firstError.error.message }
  revalidate(projectId)
  return {}
}

// ── Item CRUD ────────────────────────────────────────────────────────────────

export async function addItem(
  phaseId: string,
  projectId: string,
  title: string
): Promise<ActionResult> {
  if (!title.trim()) return { error: 'Titel ist Pflicht.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { data: existing } = await supabase
    .from('acceptance_items')
    .select('sortOrder')
    .eq('phaseId', phaseId)
    .order('sortOrder', { ascending: false })
    .limit(1)
  const nextOrder = existing?.[0] ? (existing[0] as any).sortOrder + 1 : 0

  const { error } = await supabase.from('acceptance_items').insert({
    id: randomUUID(),
    phaseId,
    title: title.trim(),
    status: 'not_checked',
    sortOrder: nextOrder,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function updateItem(
  itemId: string,
  projectId: string,
  data: {
    title?: string
    status?: 'not_checked' | 'ok' | 'defect'
    priority?: 'low' | 'medium' | 'critical' | null
    notes?: string | null
    assigneeId?: string | null
    buildTeamId?: string | null
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const update: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() }
  // Clear priority when status is not defect
  if (data.status && data.status !== 'defect') update.priority = null

  const { error } = await supabase.from('acceptance_items').update(update).eq('id', itemId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function deleteItem(itemId: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('acceptance_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

// ── Photo metadata ───────────────────────────────────────────────────────────

export async function recordItemPhoto(
  itemId: string,
  projectId: string,
  storagePath: string,
  filename: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('acceptance_item_photos').insert({
    id: randomUUID(),
    itemId,
    storagePath,
    filename,
  })
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function deleteItemPhoto(
  photoId: string,
  storagePath: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error: storageError } = await supabase.storage.from('project-attachments').remove([storagePath])
  if (storageError) console.error('[deleteItemPhoto] storage error:', storageError)
  // Still delete DB record even if storage failed (prefer consistency)
  const { error } = await supabase.from('acceptance_item_photos').delete().eq('id', photoId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

// ── Phase abschliessen ───────────────────────────────────────────────────────

export async function completePhase(
  phaseId: string,
  projectId: string,
  signatureDataUrl: string | null,
  completedById: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('acceptance_phases').update({
    completedAt: new Date().toISOString(),
    completedById: completedById ?? null,
    signatureDataUrl: signatureDataUrl ?? null,
    updatedAt: new Date().toISOString(),
  }).eq('id', phaseId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function reopenPhase(phaseId: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('acceptance_phases').update({
    completedAt: null,
    completedById: null,
    signatureDataUrl: null,
    remoteApprovalToken: null,
    remoteApprovedAt: null,
    remoteApprovedByName: null,
    updatedAt: new Date().toISOString(),
  }).eq('id', phaseId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

// ── Remote Freigabe ──────────────────────────────────────────────────────────

export async function generateRemoteApprovalLink(
  phaseId: string,
  projectId: string
): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const token = randomUUID()
  const { error } = await supabase.from('acceptance_phases').update({
    remoteApprovalToken: token,
    updatedAt: new Date().toISOString(),
  }).eq('id', phaseId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return { token }
}

export async function submitRemoteApproval(
  token: string,
  approverName: string
): Promise<ActionResult> {
  if (!approverName.trim()) return { error: 'Name ist Pflicht.' }
  // Use service role to bypass RLS on public page
  const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return { error: 'Server-Konfigurationsfehler.' }

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.from('acceptance_phases').update({
    remoteApprovedAt: new Date().toISOString(),
    remoteApprovedByName: approverName.trim(),
    updatedAt: new Date().toISOString(),
  }).eq('remoteApprovalToken', token)
  if (error) return { error: error.message }
  return {}
}
