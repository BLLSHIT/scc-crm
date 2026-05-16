'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { error?: string }

export async function addReclamation(
  projectId: string,
  input: { title: string; courtRef?: string; description?: string }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }
  if (!input.title.trim()) return { error: 'Titel erforderlich.' }

  const { error } = await supabase.from('project_reclamations').insert({
    id: randomUUID(),
    projectId,
    title: input.title.trim(),
    courtRef: input.courtRef?.trim() || null,
    description: input.description?.trim() || null,
    status: 'open',
    reportedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function updateReclamationStatus(
  id: string,
  projectId: string,
  status: 'open' | 'in_progress' | 'resolved'
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('project_reclamations')
    .update({
      status,
      resolvedAt: status === 'resolved' ? new Date().toISOString().slice(0, 10) : null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function deleteReclamation(id: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('project_reclamations').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return {}
}
