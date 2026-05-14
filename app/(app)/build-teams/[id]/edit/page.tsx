/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { BuildTeamForm } from '@/components/build-teams/BuildTeamForm'
import { getBuildTeamById } from '@/lib/db/build-teams'
import { updateBuildTeam, deleteBuildTeam } from '@/lib/actions/build-teams.actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditBuildTeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let team: any
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    team = await getBuildTeamById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Bauteam laden" err={err} />
  }
  if (!team) return <div className="p-6">Bauteam nicht gefunden.</div>

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Bauteam bearbeiten" profile={profile}
        actions={
          <form action={async () => { 'use server'; await deleteBuildTeam(id); redirect('/build-teams') }}>
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />Löschen
            </Button>
          </form>
        } />
      <main className="p-6">
        <BuildTeamForm
          title="Bauteam bearbeiten"
          defaultValues={{
            name: team.name ?? '',
            description: team.description ?? '',
            maxConcurrentProjects: team.maxConcurrentProjects ?? 2,
            isActive: team.isActive ?? true,
            notes: team.notes ?? '',
          }}
          onSubmit={updateBuildTeam.bind(null, id)}
        />
      </main>
    </div>
  )
}
