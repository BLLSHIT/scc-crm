import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TeamMemberForm } from '@/components/team/TeamMemberForm'
import { createTeamMember } from '@/lib/actions/team-members.actions'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function NewTeamMemberPage() {
  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neues Team-Mitglied" profile={profile} />
      <main className="p-6">
        <TeamMemberForm title="Team-Mitglied anlegen" onSubmit={createTeamMember} />
      </main>
    </div>
  )
}
