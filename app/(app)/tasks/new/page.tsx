/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TaskForm } from '@/components/tasks/TaskForm'
import { createTask } from '@/lib/actions/tasks.actions'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { getAllContactOptions } from '@/lib/db/contacts'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function NewTaskPage() {
  let profile: Profile | null = null
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
    return <ErrorView where="Auth/Optionen" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neue Aufgabe" profile={profile} />
      <main className="p-6">
        <TaskForm
          title="Aufgabe erstellen"
          onSubmit={createTask}
          companies={companies}
          contacts={contacts}
          deals={deals}
        />
      </main>
    </div>
  )
}
