import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkflowRuleById, getPipelineStages } from '@/lib/db/workflow-rules'
import { Header } from '@/components/layout/Header'
import { WorkflowRuleForm } from '@/components/workflows/WorkflowRuleForm'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let pipelineStages: { id: string; name: string; order: number }[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    const [rule, stages] = await Promise.all([
      getWorkflowRuleById(id),
      getPipelineStages(),
    ])

    if (!rule) notFound()
    pipelineStages = stages

    return (
      <div className="flex-1 overflow-auto">
        <Header title="Workflow-Regel bearbeiten" profile={profile} />
        <main className="p-6">
          <WorkflowRuleForm initialData={rule} pipelineStages={pipelineStages} />
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Workflow-Regel laden" err={err} />
  }
}
