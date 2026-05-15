/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { getProjectById } from '@/lib/db/projects'
import { updateProject, deleteProject } from '@/lib/actions/projects.actions'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { getAllContactOptions } from '@/lib/db/contacts'
import { getActiveTeamMemberOptions } from '@/lib/db/team-members'
import { getActiveDealOptions } from '@/lib/db/deals'
import { getActiveBuildTeamOptions } from '@/lib/db/build-teams'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let project: any
  let companies: any[] = []
  let contacts: any[] = []
  let teamMembers: any[] = []
  let deals: any[] = []
  let buildTeams: any[] = []
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    const [p, c, ct, tm, dls, bt] = await Promise.all([
      getProjectById(id),
      getAllCompanyOptions(),
      getAllContactOptions(),
      getActiveTeamMemberOptions(),
      getActiveDealOptions(),
      getActiveBuildTeamOptions(),
    ])
    project = p; companies = c; contacts = ct; teamMembers = tm; deals = dls; buildTeams = bt
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Projekt laden" err={err} />
  }
  if (!project) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">Projekt nicht gefunden.</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title={`Projekt bearbeiten`} profile={profile}
        actions={
          <form action={async () => { 'use server'; await deleteProject(id); redirect('/projects') }}>
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />Löschen
            </Button>
          </form>
        } />
      <main className="p-6">
        <ProjectForm
          title="Projekt bearbeiten"
          onSubmit={updateProject.bind(null, id)}
          companies={companies}
          contacts={contacts}
          teamMembers={teamMembers}
          deals={deals}
          buildTeams={buildTeams}
          defaultValues={{
            name: project.name ?? '',
            description: project.description ?? '',
            status: project.status ?? 'planning',
            dealId: project.dealId ?? '',
            companyId: project.companyId ?? '',
            contactId: project.contactId ?? '',
            teamMemberId: project.teamMemberId ?? '',
            buildTeamId: project.buildTeamId ?? '',
            startDate: project.startDate ? String(project.startDate).slice(0, 10) : '',
            plannedEndDate: project.plannedEndDate ? String(project.plannedEndDate).slice(0, 10) : '',
            actualEndDate: project.actualEndDate ? String(project.actualEndDate).slice(0, 10) : '',
            locationStreet: project.locationStreet ?? '',
            locationZip: project.locationZip ?? '',
            locationCity: project.locationCity ?? '',
            locationCountry: project.locationCountry ?? '',
            notes: project.notes ?? '',
          }}
        />
      </main>
    </div>
  )
}
