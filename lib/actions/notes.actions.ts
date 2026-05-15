'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/db/activity-logs'

type NoteEntityType = 'deal' | 'contact' | 'company' | 'project'

const ENTITY_PATH: Record<NoteEntityType, (id: string) => string> = {
  deal:    (id) => `/deals/${id}`,
  contact: (id) => `/contacts/${id}`,
  company: (id) => `/companies/${id}`,
  project: (id) => `/projects/${id}`,
}

export async function addNote(
  entityType: NoteEntityType,
  entityId: string,
  body: string
): Promise<void> {
  const trimmed = body.trim()
  if (!trimmed) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  let authorName: string | null = null
  const { data: profile } = await supabase
    .from('profiles')
    .select('firstName, lastName')
    .eq('id', user.id)
    .single()
  if (profile) {
    authorName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || null
  }

  const noteId = randomUUID()

  const { error } = await supabase.from('note_entries').insert({
    id: noteId,
    entityType,
    entityId,
    body: trimmed,
    authorId: user.id,
    authorName,
  })

  if (error) {
    console.error('[addNote]', error)
    return
  }

  await logActivity({
    entityType,
    entityId,
    action: 'note_added',
    summary: trimmed.slice(0, 120),
    metadata: { noteId, authorId: user.id, authorName },
  })

  revalidatePath(ENTITY_PATH[entityType](entityId))
}

export async function deleteNote(
  noteId: string,
  entityType: NoteEntityType,
  entityId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const [profileRes, noteRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('note_entries').select('authorId, entityId').eq('id', noteId).single(),
  ])

  if (!noteRes.data) return
  if (noteRes.data.authorId !== user.id && profileRes.data?.role !== 'admin') return
  if (noteRes.data.entityId !== entityId) return

  const { error } = await supabase.from('note_entries').delete().eq('id', noteId)
  if (error) {
    console.error('[deleteNote]', error)
    return
  }

  revalidatePath(ENTITY_PATH[entityType](entityId))
}
