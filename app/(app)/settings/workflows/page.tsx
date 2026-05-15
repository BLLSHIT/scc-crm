import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkflowRules } from '@/lib/db/workflow-rules'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { WorkflowToggle } from '@/components/workflows/WorkflowToggle'
import { WorkflowDeleteButton } from '@/components/workflows/WorkflowDeleteButton'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { Plus, Pencil } from 'lucide-react'
import type { Profile } from '@/types/app.types'
import type { WorkflowRule } from '@/lib/db/workflow-rules'

const TRIGGER_LABELS: Record<WorkflowRule['triggerType'], string> = {
  deal_stage_changed: 'Deal: Phase geändert',
  quote_expiring: 'Angebot: läuft ab',
  deal_inactive: 'Deal: inaktiv',
  project_status_changed: 'Projekt: Status geändert',
}

const ACTION_LABELS: Record<WorkflowRule['actionType'], string> = {
  create_task: 'Aufgabe erstellen',
  create_project: 'Projekt erstellen',
}

export default async function WorkflowsPage() {
  let profile: Profile | null = null
  let rules: WorkflowRule[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    rules = await getWorkflowRules()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Workflow-Regeln laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title="Workflows"
        profile={profile}
        actions={
          <Link href="/settings/workflows/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Neue Regel
          </Link>
        }
      />
      <main className="p-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Trigger</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Aktion</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    Keine Workflow-Regeln.{' '}
                    <Link href="/settings/workflows/new" className="text-blue-600 hover:underline">
                      Erste Regel anlegen
                    </Link>
                  </td>
                </tr>
              )}
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{rule.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {TRIGGER_LABELS[rule.triggerType]}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {ACTION_LABELS[rule.actionType]}
                  </td>
                  <td className="px-4 py-3">
                    <WorkflowToggle id={rule.id} isEnabled={rule.isEnabled} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/settings/workflows/${rule.id}/edit`}
                        className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Bearbeiten"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <WorkflowDeleteButton id={rule.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
