import { createClient } from '@/lib/supabase/server'

export async function getDealAttachments(dealId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deal_attachments')
    .select('*')
    .eq('dealId', dealId)
    .order('createdAt', { ascending: false })
  if (error) {
    console.error('[getDealAttachments] error:', error)
    return []
  }
  return data ?? []
}

/** Signed-URL für Download (1h gültig) */
export async function getDealAttachmentSignedUrl(storagePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .storage.from('deal-attachments')
    .createSignedUrl(storagePath, 3600)
  if (error) {
    console.error('[getDealAttachmentSignedUrl] error:', error)
    return null
  }
  return data?.signedUrl ?? null
}
