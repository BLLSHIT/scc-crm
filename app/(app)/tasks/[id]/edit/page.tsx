/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TaskForm } from '@/components/tasks/TaskForm'
import { getTaskById } from '@/lib/db/tasks'
import { updateTask, deleteTask } from '@/lib/actions/tasks.actions'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { getAllContactOptions } from '@/lib/db/contacts'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let profile: Profile | null = null
  let task: any
  let companies: { id: string; label: string }[] = []
  let contacts: { id: string; label: string }[] = []
  let deals: { id: string; label: string }[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    task = await getTaskById(id)

    const [c, p, dResult] = await Promise.all([
      getAllCompanyOptions(),
      getAllContactOptions(),
      supabase.from('deals').select('id, title').order('createdAt', { ascending: false }),
    ])
    companies = c.map((x) => ({ id: x.id, label: x.name }))
    contacts = p.map((x) => ({ id: x.id, label: `${x.firstName} ${x.lastName}` }))
    deals = (dResult.data ?? []).map((x: any) => ({ id: x.id, label: x.title }))
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Aufgabe laden" err={err} />
  }

  if (!task) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Aufgabe nicht gefunden.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title="Aufgabe bearbeiten"
        profile={profile}
        actions={
          <form
            action={async () => {
              'use server'
              await deleteTask(id)
              redirect('/tasks')
            }}
          >
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </Button>
          </form>
        }
      />
      <main className="p-6">
        <TaskForm
          title="Aufgabe bearbeiten"
          defaultValues={{
            title: task.title ?? '',
            description: task.description ?? '',
            status: task.status ?? 'open',
            priority: task.priority ?? 'medium',
            dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : '',
            assigneeId: task.assigneeId ?? '',
            dealId: task.dealId ?? '',
            contactId: task.contactId ?? '',
            companyId: task.companyId ?? '',
          }}
          onSubmit={updateTask.bind(null, id)}
          companies={companies}
          contacts={contacts}
          deals={deals}
        />
      </main>
    </div>
  )
}
