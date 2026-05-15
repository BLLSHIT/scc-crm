import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

export type EntityType =
  | 'contact'
  | 'company'
  | 'deal'
  | 'quote'
  | 'task'
  | 'team_member'
  | 'product'
  | 'project'

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'file_uploaded'
  | 'file_deleted'
  | 'note_added'

interface LogParams {
  entityType: EntityType
  entityId: string
  action: ActivityAction
  summary?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
}

/**
 * Schreibt einen Activity-Log-Eintrag. Failt nie hart — Fehler werden
 * nur geloggt, damit ein Logging-Problem den eigentlichen User-Action
 * nicht torpediert.
 */
export async function logActivity(params: LogParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let userName: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firstName, lastName, email')
        .eq('id', user.id)
        .single()
      if (profile) {
        userName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.email
      }
    }
    await supabase.from('activity_logs').insert({
      id: randomUUID(),
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: user?.id ?? null,
      userName,
      summary: params.summary ?? null,
      metadata: params.metadata ?? null,
    })
  } catch (e) {
    console.error('[logActivity] failed:', e)
  }
}

export async function getActivityLogs(entityType: EntityType, entityId: string, limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('entityType', entityType)
    .eq('entityId', entityId)
    .order('createdAt', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[getActivityLogs] error:', error)
    return []
  }
  return data ?? []
}

export interface FeedItem {
  id: string
  action: string
  summary: string | null
  entityType: string
  entityId: string
  userName: string | null
  createdAt: string
  entityLabel?: string
}

export async function getRecentActivity(limit = 20): Promise<FeedItem[]> {
  const supabase = await createClient()

  const [logsResult, notesResult] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('id, action, summary, entityType, entityId, userName, createdAt')
      .neq('action', 'note_added')
      .order('createdAt', { ascending: false })
      .limit(20),
    supabase
      .from('note_entries')
      .select('id, "entityType", "entityId", body, "authorName", "createdAt"')
      .order('createdAt', { ascending: false })
      .limit(20),
  ])

  const logItems: FeedItem[] = (logsResult.data ?? []).map((l) => ({
    id: l.id,
    action: l.action,
    summary: l.summary ?? null,
    entityType: l.entityType,
    entityId: l.entityId,
    userName: l.userName ?? null,
    createdAt: l.createdAt,
  }))

  const noteItems: FeedItem[] = (notesResult.data ?? []).map((n) => ({
    id: n.id,
    action: 'note_added',
    summary: n.body ? String(n.body).slice(0, 120) : null,
    entityType: n.entityType,
    entityId: n.entityId,
    userName: n.authorName ?? null,
    createdAt: n.createdAt,
  }))

  const merged = [...logItems, ...noteItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  // Batch entity-label lookup grouped by entityType
  const byType = new Map<string, string[]>()
  for (const item of merged) {
    if (!byType.has(item.entityType)) byType.set(item.entityType, [])
    byType.get(item.entityType)!.push(item.entityId)
  }

  const labelMap = new Map<string, string>()

  await Promise.all(
    Array.from(byType.entries()).map(async ([type, ids]) => {
      const uniqueIds = [...new Set(ids)]
      if (type === 'deal') {
        const { data } = await supabase
          .from('deals')
          .select('id, title')
          .in('id', uniqueIds)
        for (const row of data ?? []) labelMap.set(row.id, row.title)
      } else if (type === 'contact') {
        const { data } = await supabase
          .from('contacts')
          .select('id, "firstName", "lastName"')
          .in('id', uniqueIds)
        for (const row of data ?? []) {
          labelMap.set(row.id, `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || row.id)
        }
      } else if (type === 'company') {
        const { data } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', uniqueIds)
        for (const row of data ?? []) labelMap.set(row.id, row.name)
      } else if (type === 'project') {
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', uniqueIds)
        for (const row of data ?? []) labelMap.set(row.id, row.name)
      }
    })
  )

  return merged.map((item) => ({
    ...item,
    entityLabel: labelMap.get(item.entityId),
  }))
}
