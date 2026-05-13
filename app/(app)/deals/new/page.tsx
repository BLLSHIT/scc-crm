/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { DealForm } from '@/components/deals/DealForm'
import { createDeal } from '@/lib/actions/deals.actions'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { getAllContactOptions } from '@/lib/db/contacts'
import type { Profile } from '@/types/app.types'

function isFrameworkError(err: any): boolean {
  const d = err?.digest
  return typeof d === 'string' && (d.startsWith('NEXT_REDIRECT') || d === 'NEXT_NOT_FOUND')
}

function ErrorView({ where, err }: { where: string; err: any }) {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
        <h2 className="font-semibold text-red-800">Fehler in {where}</h2>
        <pre className="text-xs text-red-700 whitespace-pre-wrap break-all bg-white border border-red-100 rounded p-3">
{`name:    ${err?.name ?? '(none)'}
message: ${err?.message ?? String(err)}
code:    ${err?.code ?? '(none)'}
hint:    ${err?.hint ?? '(none)'}
details: ${err?.details ?? '(none)'}
digest:  ${err?.digest ?? '(none)'}

stack:
${err?.stack ?? '(none)'}`}
        </pre>
      </div>
    </div>
  )
}

export default async function NewDealPage() {
  let profile: Profile | null = null
  let pipeline: any = null

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

    const pipelineResult = await supabase
      .from('pipelines')
      .select('id, stages:pipeline_stages(id, name, order)')
      .eq('isDefault', true)
      .single()
    if (pipelineResult.error) {
      console.error('[new-deal] pipeline error:', pipelineResult.error)
    }
    pipeline = pipelineResult.data
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth/Pipeline" err={err} />
  }

  if (!pipeline) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          Keine Standard-Pipeline gefunden. Bitte zuerst eine Pipeline einrichten
          (Seed-Script ausführen).
        </div>
      </div>
    )
  }

  const [companies, contacts] = await Promise.all([
    getAllCompanyOptions(),
    getAllContactOptions(),
  ])

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Neuer Deal" profile={profile} />
        <main className="p-6">
          <DealForm
            title="Deal erstellen"
            pipelineId={pipeline.id ?? ''}
            stages={pipeline.stages ?? []}
            companies={companies}
            contacts={contacts}
            onSubmit={createDeal}
          />
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Render" err={err} />
  }
}
