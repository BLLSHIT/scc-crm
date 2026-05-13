import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { DealForm } from '@/components/deals/DealForm'
import { createDeal } from '@/lib/actions/deals.actions'
import type { Profile } from '@/types/app.types'

export default async function NewDealPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id, stages:pipeline_stages(id, name, order)')
    .eq('isDefault', true)
    .single()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neuer Deal" profile={profile as Profile} />
      <main className="p-6">
        <DealForm
          title="Deal erstellen"
          pipelineId={pipeline?.id ?? ''}
          stages={pipeline?.stages ?? []}
          onSubmit={createDeal}
        />
      </main>
    </div>
  )
}
