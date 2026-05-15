// lib/db/acceptance-protocol.ts
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AcceptanceItemPhoto {
  id: string
  itemId: string
  storagePath: string
  filename: string
  createdAt: string
}

export interface AcceptanceItem {
  id: string
  phaseId: string
  title: string
  status: 'not_checked' | 'ok' | 'defect'
  priority: 'low' | 'medium' | 'critical' | null
  notes: string | null
  assigneeId: string | null
  buildTeamId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  photos: AcceptanceItemPhoto[]
  assignee: { id: string; firstName: string; lastName: string } | null
  buildTeam: { id: string; name: string } | null
}

export interface AcceptancePhase {
  id: string
  protocolId: string
  name: string
  sortOrder: number
  completedAt: string | null
  completedById: string | null
  signatureDataUrl: string | null
  remoteApprovalToken: string | null
  remoteApprovedAt: string | null
  remoteApprovedByName: string | null
  createdAt: string
  updatedAt: string
  items: AcceptanceItem[]
  completedBy: { id: string; firstName: string; lastName: string } | null
}

export interface AcceptanceProtocol {
  id: string
  projectId: string
  createdAt: string
  updatedAt: string
  phases: AcceptancePhase[]
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getOrCreateProtocol(projectId: string): Promise<AcceptanceProtocol> {
  const supabase = await createClient()

  const id = randomUUID()
  const { data: upserted, error } = await supabase
    .from('acceptance_protocols')
    .upsert(
      { id, projectId, updatedAt: new Date().toISOString() },
      { onConflict: 'projectId', ignoreDuplicates: false }
    )
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  return getProtocolWithDetails(upserted.id)
}

export async function getProtocolWithDetails(protocolId: string): Promise<AcceptanceProtocol> {
  const supabase = await createClient()

  const { data: protocol, error: pErr } = await supabase
    .from('acceptance_protocols')
    .select('*')
    .eq('id', protocolId)
    .single()
  if (pErr || !protocol) throw new Error(pErr?.message ?? 'Protokoll nicht gefunden')

  const { data: phases, error: phErr } = await supabase
    .from('acceptance_phases')
    .select(`*, completedBy:team_members!completedById(id, firstName, lastName)`)
    .eq('protocolId', protocolId)
    .order('sortOrder', { ascending: true })
  if (phErr) throw new Error(phErr.message)

  const phaseList: AcceptancePhase[] = await Promise.all(
    (phases ?? []).map(async (phase) => {
      const { data: items } = await supabase
        .from('acceptance_items')
        .select(`
          *,
          assignee:team_members!assigneeId(id, firstName, lastName),
          buildTeam:build_teams!buildTeamId(id, name)
        `)
        .eq('phaseId', phase.id)
        .order('sortOrder', { ascending: true })

      const itemList: AcceptanceItem[] = await Promise.all(
        (items ?? []).map(async (item) => {
          const { data: photos, error: photoErr } = await supabase
            .from('acceptance_item_photos')
            .select('*')
            .eq('itemId', item.id)
            .order('createdAt', { ascending: true })
          if (photoErr) console.error(`[getProtocolWithDetails] photos error for item ${item.id}:`, photoErr)
          return {
            ...item,
            photos: (photos ?? []) as AcceptanceItemPhoto[],
          } as AcceptanceItem
        })
      )

      return {
        ...phase,
        items: itemList,
        completedBy: phase.completedBy ?? null,
      } as AcceptancePhase
    })
  )

  return { ...protocol, phases: phaseList } as AcceptanceProtocol
}

export async function getPhaseByRemoteToken(token: string): Promise<{
  phase: AcceptancePhase
  projectName: string
  protocolId: string
} | null> {
  const supabase = await createClient()

  const { data: phase, error: phaseErr } = await supabase
    .from('acceptance_phases')
    .select('*')
    .eq('remoteApprovalToken', token)
    .single()
  if (phaseErr || !phase) {
    if (phaseErr?.code !== 'PGRST116') console.error('[getPhaseByRemoteToken] error:', phaseErr)
    return null
  }

  const { data: protocol } = await supabase
    .from('acceptance_protocols')
    .select('*, project:projects(name)')
    .eq('id', phase.protocolId)
    .single()
  if (!protocol) return null

  const { data: items } = await supabase
    .from('acceptance_items')
    .select('*, assignee:team_members!assigneeId(id, firstName, lastName), buildTeam:build_teams!buildTeamId(id, name)')
    .eq('phaseId', phase.id)
    .order('sortOrder', { ascending: true })

  const itemList: AcceptanceItem[] = await Promise.all(
    (items ?? []).map(async (item) => {
      const { data: photos, error: photoErr } = await supabase
        .from('acceptance_item_photos')
        .select('*')
        .eq('itemId', item.id)
      if (photoErr) console.error(`[getPhaseByRemoteToken] photos error for item ${item.id}:`, photoErr)
      return { ...item, photos: photos ?? [] } as AcceptanceItem
    })
  )

  return {
    phase: { ...phase, items: itemList, completedBy: null } as AcceptancePhase,
    projectName: (protocol.project as { name: string } | null)?.name ?? '',
    protocolId: protocol.id,
  }
}
