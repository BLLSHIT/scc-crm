import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { BuildTeamForm } from '@/components/build-teams/BuildTeamForm'
import { createBuildTeam } from '@/lib/actions/build-teams.actions'
import type { Profile } from '@/types/app.types'

export default async function NewBuildTeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neues Bauteam" profile={(profile as Profile) ?? null} />
      <main className="p-6">
        <BuildTeamForm title="Bauteam anlegen" onSubmit={createBuildTeam} />
      </main>
    </div>
  )
}
