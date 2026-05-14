/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDealById } from '@/lib/db/deals'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { getAllContactOptions, getDealContactIds } from '@/lib/db/contacts'
import { getActiveTeamMemberOptions } from '@/lib/db/team-members'
import { updateDeal } from '@/lib/actions/deals.actions'
import { Header } from '@/components/layout/Header'
import { DealForm } from '@/components/deals/DealForm'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let profile: Profile | null = null
  let stages: any[] = []
  let deal: any = null

  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!userData.user) redirect('/login')

    const profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()
    profile = (profileResult.data as Profile) ?? null

    deal = await getDealById(id)

    if (deal?.pipelineId) {
      const stagesResult = await supabase
        .from('pipeline_stages')
        .select('id, name, order')
        .eq('pipelineId', deal.pipelineId)
        .order('order', { ascending: true })
      stages = stagesResult.data ?? []
    }
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth/Deal/Stages" err={err} />
  }

  if (!deal) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Deal nicht gefunden.
        </div>
      </div>
    )
  }

  const [companies, contactOptions, defaultContactIds, teamMembers] = await Promise.all([
    getAllCompanyOptions(),
    getAllContactOptions(),
    getDealContactIds(id),
    getActiveTeamMemberOptions(),
  ])

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Deal bearbeiten" profile={profile} />
        <main className="p-6">
          <DealForm
            title="Deal bearbeiten"
            pipelineId={deal.pipelineId}
            stages={stages}
            companies={companies}
            contacts={contactOptions}
            teamMembers={teamMembers}
            defaultContactIds={defaultContactIds}
            defaultValues={{
              title: deal.title ?? '',
              value: Number(deal.value ?? 0),
              currency: deal.currency ?? 'EUR',
              probability: Number(deal.probability ?? 0),
              expectedCloseAt: deal.expectedCloseAt
                ? String(deal.expectedCloseAt).slice(0, 10)
                : '',
              description: deal.description ?? '',
              pipelineId: deal.pipelineId,
              stageId: deal.stageId,
              companyId: deal.companyId ?? '',
              ownerId: deal.ownerId ?? '',
              teamMemberId: deal.teamMemberId ?? '',
              projectStatus: deal.projectStatus ?? 'none',
            }}
            onSubmit={updateDeal.bind(null, id)}
          />
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Render" err={err} />
  }
}
