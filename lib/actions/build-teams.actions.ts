'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  buildTeamSchema, buildTeamMemberSchema,
  type BuildTeamInput, type BuildTeamMemberInput,
} from '@/lib/validations/build-team.schema'

export type ActionResult = { error?: Record<string, string[]>; redirectTo?: string }

function clean(input: BuildTeamInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    maxConcurrentProjects: input.maxConcurrentProjects,
    isActive: input.isActive,
    notes: input.notes?.trim() || null,
  }
}

export async function createBuildTeam(input: BuildTeamInput): Promise<ActionResult> {
  const parsed = buildTeamSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const id = randomUUID()
  const { error } = await supabase.from('build_teams').insert({
    id, ...clean(parsed.data),
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[createBuildTeam]', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/build-teams')
  return { redirectTo: `/build-teams/${id}` }
}

export async function updateBuildTeam(id: string, input: BuildTeamInput): Promise<ActionResult> {
  const parsed = buildTeamSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { error } = await supabase
    .from('build_teams')
    .update({ ...clean(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/build-teams')
  revalidatePath(`/build-teams/${id}`)
  return { redirectTo: `/build-teams/${id}` }
}

export async function deleteBuildTeam(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('build_teams').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/build-teams')
  redirect('/build-teams')
}

// ─── Members ─────────────────────────────────────────────────

function cleanMember(input: BuildTeamMemberInput) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    role: input.role?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    isExternal: input.isExternal,
    companyName: input.companyName?.trim() || null,
    notes: input.notes?.trim() || null,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  }
}

export async function createBuildTeamMember(
  buildTeamId: string,
  input: BuildTeamMemberInput
): Promise<ActionResult> {
  const parsed = buildTeamMemberSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { error } = await supabase.from('build_team_members').insert({
    id: randomUUID(),
    buildTeamId,
    ...cleanMember(parsed.data),
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/build-teams/${buildTeamId}`)
  return { redirectTo: `/build-teams/${buildTeamId}` }
}

export async function updateBuildTeamMember(
  id: string,
  input: BuildTeamMemberInput
): Promise<ActionResult> {
  const parsed = buildTeamMemberSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('build_team_members').select('buildTeamId').eq('id', id).single()
  const { error } = await supabase
    .from('build_team_members')
    .update({ ...cleanMember(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  if (row?.buildTeamId) revalidatePath(`/build-teams/${row.buildTeamId}`)
  return { redirectTo: row?.buildTeamId ? `/build-teams/${row.buildTeamId}` : '/build-teams' }
}

export async function deleteBuildTeamMember(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('build_team_members').select('buildTeamId').eq('id', id).single()
  const { error } = await supabase.from('build_team_members').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  if (row?.buildTeamId) revalidatePath(`/build-teams/${row.buildTeamId}`)
  return {}
}
