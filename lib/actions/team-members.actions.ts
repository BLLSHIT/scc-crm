'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { teamMemberSchema, type TeamMemberInput } from '@/lib/validations/team-member.schema'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

function clean(input: TeamMemberInput) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile?.trim() || null,
    position: input.position?.trim() || null,
    isActive: input.isActive,
  }
}

export async function createTeamMember(input: TeamMemberInput): Promise<ActionResult> {
  const parsed = teamMemberSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('team_members').insert({
    id: randomUUID(),
    ...clean(parsed.data),
    updatedAt: now,
  })

  if (error) {
    console.error('[createTeamMember] error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/teams')
  return { redirectTo: '/teams' }
}

export async function updateTeamMember(
  id: string,
  input: TeamMemberInput
): Promise<ActionResult> {
  const parsed = teamMemberSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase
    .from('team_members')
    .update({ ...clean(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[updateTeamMember] error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/teams')
  revalidatePath(`/teams/${id}/edit`)
  return { redirectTo: '/teams' }
}

export async function deleteTeamMember(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) {
    console.error('[deleteTeamMember] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/teams')
  redirect('/teams')
}
