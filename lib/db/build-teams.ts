import { createClient } from '@/lib/supabase/server'

export async function getBuildTeams() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('build_teams')
    .select(`*, members:build_team_members(id, firstName, lastName, role, isActive)`)
    .order('name', { ascending: true })
  if (error) {
    console.error('[getBuildTeams] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getActiveBuildTeamOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('build_teams')
    .select('id, name, maxConcurrentProjects')
    .eq('isActive', true)
    .order('name', { ascending: true })
  if (error) {
    console.error('[getActiveBuildTeamOptions] error:', error)
    return []
  }
  return data ?? []
}

export async function getBuildTeamById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('build_teams')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getBuildTeamMembers(teamId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('build_team_members')
    .select('*')
    .eq('buildTeamId', teamId)
    .order('sortOrder', { ascending: true })
    .order('lastName', { ascending: true })
  if (error) {
    console.error('[getBuildTeamMembers] error:', error)
    return []
  }
  return data ?? []
}

export async function getBuildTeamMemberById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('build_team_members')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Aktive Projektzuweisungen eines Bauteams. Wird genutzt für Konflikt-Erkennung.
 * "Aktiv" = Status nicht completed/cancelled.
 */
export async function getActiveProjectsForBuildTeam(buildTeamId: string, excludeProjectId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('projects')
    .select('id, name, status, startDate, plannedEndDate, actualEndDate')
    .eq('buildTeamId', buildTeamId)
    .not('status', 'in', '(completed,cancelled)')
  if (excludeProjectId) query = query.neq('id', excludeProjectId)
  const { data, error } = await query
  if (error) {
    console.error('[getActiveProjectsForBuildTeam] error:', error)
    return []
  }
  return data ?? []
}
