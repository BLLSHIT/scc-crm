/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { createProject } from '@/lib/actions/projects.actions'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { getAllContactOptions } from '@/lib/db/contacts'
import { getActiveTeamMemberOptions } from '@/lib/db/team-members'
import { getActiveDealOptions } from '@/lib/db/deals'
import { getActiveBuildTeamOptions } from '@/lib/db/build-teams'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>
}) {
  const sp = await searchParams
  let profile: Profile | null = null
  let companies: any[] = []
  let contacts: any[] = []
  let teamMembers: any[] = []
  let deals: any[] = []
  let buildTeams: any[] = []
  let prefill: any = {}

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    const [c, p, tm, dls, bt] = await Promise.all([
      getAllCompanyOptions(),
      getAllContactOptions(),
      getActiveTeamMemberOptions(),
      getActiveDealOptions(),
      getActiveBuildTeamOptions(),
    ])
    companies = c; contacts = p; teamMembers = tm; deals = dls; buildTeams = bt

    if (sp.dealId) {
      const { data: deal } = await supabase
        .from('deals')
        .select('id, title, description, companyId, teamMemberId')
        .eq('id', sp.dealId).single()
      if (deal) {
        prefill = {
          name: deal.title,
          description: deal.description,
          companyId: deal.companyId ?? '',
          teamMemberId: deal.teamMemberId ?? '',
          dealId: deal.id,
        }
      }
    }
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Projekt vorbereiten" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neues Projekt" profile={profile} />
      <main className="p-6">
        <ProjectForm
          title="Projekt anlegen"
          onSubmit={createProject}
          companies={companies}
          contacts={contacts}
          teamMembers={teamMembers}
          deals={deals}
          buildTeams={buildTeams}
          defaultValues={prefill}
        />
      </main>
    </div>
  )
}
