import { createClient } from '@/lib/supabase/server'

export type ProjectStatus = 'planning' | 'ordered' | 'installation' | 'completed' | 'on_hold' | 'cancelled'

export interface ProjectFilters {
  q?: string
  status?: ProjectStatus
  teamMemberId?: string
  companyId?: string
  showCompleted?: boolean
}

export async function getProjects(filters: ProjectFilters = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('projects')
    .select(
      `id, name, status, startDate, plannedEndDate, actualEndDate, locationCity, buildTeamId, createdAt,
       company:companies(id, name),
       teamMember:team_members(id, firstName, lastName, abbreviation),
       buildTeam:build_teams(id, name),
       deal:deals(id, title, value, currency),
       milestones:project_milestones(id, title, startDate, dueDate, completedAt, sortOrder)`
    )
    .order('createdAt', { ascending: false })
  if (filters.q) {
    query = query.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (!filters.showCompleted) query = query.neq('status', 'completed')
  if (filters.teamMemberId) query = query.eq('teamMemberId', filters.teamMemberId)
  if (filters.companyId) query = query.eq('companyId', filters.companyId)
  const { data, error } = await query
  if (error) {
    console.error('[getProjects] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getProjectById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(
      `*,
       company:companies(id, name, email, phone, city, country),
       contact:contacts(id, firstName, lastName, email, phone, position),
       teamMember:team_members(id, firstName, lastName, email, mobile, position),
       buildTeam:build_teams(id, name),
       deal:deals(id, title, value, currency, stage:pipeline_stages(name, color))`
    )
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getProjectById] error:', error)
    throw new Error(error.message)
  }

  const [milestonesRes, punchRes, materialRes] = await Promise.all([
    supabase.from('project_milestones').select('*').eq('projectId', id)
      .order('sortOrder', { ascending: true }).order('createdAt', { ascending: true }),
    supabase.from('project_punch_items').select('*').eq('projectId', id)
      .order('sortOrder', { ascending: true }).order('createdAt', { ascending: true }),
    supabase.from('project_material_items').select('*').eq('projectId', id)
      .order('sortOrder', { ascending: true }).order('createdAt', { ascending: true }),
  ])

  return {
    ...data,
    milestones: milestonesRes.data ?? [],
    punchItems: punchRes.data ?? [],
    materialItems: materialRes.data ?? [],
  }
}

export async function getProjectsByDealId(dealId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, status, plannedEndDate, createdAt')
    .eq('dealId', dealId)
    .order('createdAt', { ascending: false })
  return data ?? []
}

export async function getProjectMilestones(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('project_milestones').select('*').eq('projectId', projectId)
    .order('sortOrder', { ascending: true }).order('createdAt', { ascending: true })
  return data ?? []
}

export async function getProjectByShareToken(token: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(
      `id, name, status, startDate, plannedEndDate, locationCity, locationStreet, locationZip, locationCountry,
       company:companies(id, name),
       teamMember:team_members(id, firstName, lastName)`
    )
    .eq('shareToken', token)
    .single()
  if (error || !data) return null

  const [milestonesRes, punchRes] = await Promise.all([
    supabase.from('project_milestones').select('id, title, completedAt, sortOrder')
      .eq('projectId', data.id).order('sortOrder', { ascending: true }),
    supabase.from('project_punch_items').select('id, title, isDone, sortOrder')
      .eq('projectId', data.id).order('sortOrder', { ascending: true }),
  ])
  return { ...data, milestones: milestonesRes.data ?? [], punchItems: punchRes.data ?? [] }
}

export async function getProjectAttachments(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_attachments').select('*').eq('projectId', projectId)
    .order('createdAt', { ascending: false })
  if (error) {
    console.error('[getProjectAttachments] error:', error)
    return []
  }
  return data ?? []
}
