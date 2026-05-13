/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TeamMemberForm } from '@/components/team/TeamMemberForm'
import { getTeamMemberById } from '@/lib/db/team-members'
import { updateTeamMember, deleteTeamMember } from '@/lib/actions/team-members.actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let profile: Profile | null = null
  let member: any
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    member = await getTeamMemberById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Team-Mitglied laden" err={err} />
  }

  if (!member) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Mitglied nicht gefunden.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title="Team-Mitglied bearbeiten"
        profile={profile}
        actions={
          <form
            action={async () => {
              'use server'
              await deleteTeamMember(id)
              redirect('/teams')
            }}
          >
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </Button>
          </form>
        }
      />
      <main className="p-6">
        <TeamMemberForm
          title="Team-Mitglied bearbeiten"
          defaultValues={{
            firstName: member.firstName ?? '',
            lastName: member.lastName ?? '',
            email: member.email ?? '',
            mobile: member.mobile ?? '',
            position: member.position ?? '',
            isActive: member.isActive ?? true,
          }}
          onSubmit={updateTeamMember.bind(null, id)}
        />
      </main>
    </div>
  )
}
