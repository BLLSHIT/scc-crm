'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/db/activity-logs'

export type AttachmentCategory = 'lageplan' | 'rendering' | 'po' | 'other'

export type ActionResult = {
  error?: string
  attachment?: {
    id: string
    filename: string
    storagePath: string
    category: AttachmentCategory
    fileSize: number | null
    mimeType: string | null
  }
}

/**
 * Wird vom Client nach erfolgreichem Storage-Upload aufgerufen,
 * um die Metadaten in deal_attachments zu schreiben.
 * Der eigentliche File-Upload passiert clientseitig direkt zum Storage,
 * weil File-Objekte sich nicht durch Server Actions transportieren lassen.
 */
export async function recordDealAttachment(input: {
  dealId: string
  filename: string
  storagePath: string
  fileSize: number
  mimeType: string
  category: AttachmentCategory
}): Promise<ActionResult> {
  if (!input.dealId || !input.storagePath || !input.filename) {
    return { error: 'Pflichtfelder fehlen.' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let userName: string | null = null
  if (user) {
    const { data: p } = await supabase
      .from('profiles').select('firstName, lastName, email').eq('id', user.id).single()
    if (p) userName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email
  }

  const id = randomUUID()
  const { error } = await supabase.from('deal_attachments').insert({
    id,
    dealId: input.dealId,
    filename: input.filename,
    storagePath: input.storagePath,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    category: input.category,
    uploadedBy: user?.id ?? null,
    uploadedByName: userName,
  })
  if (error) {
    console.error('[recordDealAttachment] error:', error)
    return { error: error.message }
  }

  await logActivity({
    entityType: 'deal',
    entityId: input.dealId,
    action: 'file_uploaded',
    summary: `Datei „${input.filename}" hochgeladen (${input.category})`,
    metadata: { attachmentId: id, category: input.category },
  })

  revalidatePath(`/deals/${input.dealId}`)
  return {
    attachment: {
      id, filename: input.filename, storagePath: input.storagePath,
      category: input.category, fileSize: input.fileSize, mimeType: input.mimeType,
    },
  }
}

export async function deleteDealAttachment(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  // erst Metadaten holen für storagePath + dealId
  const { data: row } = await supabase
    .from('deal_attachments')
    .select('id, dealId, filename, storagePath')
    .eq('id', id)
    .single()
  if (!row) return { error: 'Anhang nicht gefunden.' }

  // Storage löschen
  const { error: stErr } = await supabase.storage
    .from('deal-attachments')
    .remove([row.storagePath])
  if (stErr) {
    console.error('[deleteDealAttachment] storage remove error:', stErr)
  }
  // DB-Eintrag löschen
  const { error } = await supabase.from('deal_attachments').delete().eq('id', id)
  if (error) return { error: error.message }

  await logActivity({
    entityType: 'deal',
    entityId: row.dealId,
    action: 'file_deleted',
    summary: `Datei „${row.filename}" gelöscht`,
  })

  revalidatePath(`/deals/${row.dealId}`)
  return {}
}

/** Erzeugt eine Signed-URL für den Download (1h gültig) */
export async function getAttachmentDownloadUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .storage.from('deal-attachments')
    .createSignedUrl(storagePath, 3600)
  if (error) {
    console.error('[getAttachmentDownloadUrl] error:', error)
    return null
  }
  return data?.signedUrl ?? null
}
