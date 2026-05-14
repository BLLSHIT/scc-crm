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

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'file_uploaded'
  | 'file_deleted'

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

export async function getRecentActivity(limit = 20) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(limit)
  if (error) return []
  return data ?? []
}
