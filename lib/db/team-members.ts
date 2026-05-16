import { createClient } from '@/lib/supabase/server'

export async function getTeamMembers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('id, firstName, lastName, email, mobile, position, abbreviation, isActive, createdAt')
    .order('lastName', { ascending: true })
  if (error) {
    console.error('[getTeamMembers] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getActiveTeamMemberOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('id, firstName, lastName, email, mobile, position, abbreviation')
    .eq('isActive', true)
    .order('lastName', { ascending: true })
  if (error) {
    console.error('[getActiveTeamMemberOptions] error:', error)
    return []
  }
  return data ?? []
}

export async function getTeamMemberById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getTeamMemberById] error:', error)
    throw new Error(error.message)
  }
  return data
}
