import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { BuildTeamMemberForm } from '@/components/build-teams/BuildTeamMemberForm'
import { createBuildTeamMember } from '@/lib/actions/build-teams.actions'
import { getBuildTeamById } from '@/lib/db/build-teams'
import type { Profile } from '@/types/app.types'

export default async function NewBuildTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  const team = await getBuildTeamById(id)
  return (
    <div className="flex-1 overflow-auto">
      <Header title={`${team?.name ?? 'Bauteam'} — Neues Mitglied`} profile={(profile as Profile) ?? null} />
      <main className="p-6">
        <BuildTeamMemberForm
          title="Bauteam-Mitglied anlegen"
          onSubmit={createBuildTeamMember.bind(null, id)}
        />
      </main>
    </div>
  )
}
