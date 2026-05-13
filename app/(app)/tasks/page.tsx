/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/lib/db/tasks'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus, CheckCircle2, Circle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { TaskStatusToggle } from '@/components/tasks/TaskStatusToggle'
import type { Profile } from '@/types/app.types'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams

  let profile: Profile | null = null
  let tasks: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    tasks = await getTasks({
      q: params.q,
      status: params.status as any,
    })
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Tasks laden" err={err} />
  }

  const filters = [
    { label: 'Alle', value: undefined },
    { label: 'Offen', value: 'open' },
    { label: 'In Bearbeitung', value: 'in_progress' },
    { label: 'Erledigt', value: 'done' },
  ]

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Aufgaben (${tasks.length})`}
        profile={profile}
        actions={
          <Link href="/tasks/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Aufgabe
          </Link>
        }
      />
      <main className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SearchBar placeholder="Aufgaben durchsuchen…" />
          <div className="flex gap-1">
            {filters.map((f) => {
              const isActive = (params.status ?? undefined) === f.value
              const href = f.value ? `/tasks?status=${f.value}` : '/tasks'
              return (
                <Link
                  key={f.label}
                  href={href}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="w-10"></th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Titel</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Priorität</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Fällig</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Verknüpft mit</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Keine Aufgaben.{' '}
                    <Link href="/tasks/new" className="text-blue-600 hover:underline">
                      Erste Aufgabe anlegen
                    </Link>
                  </td>
                </tr>
              )}
              {tasks.map((t: any) => {
                const isDone = t.status === 'done'
                const isOverdue =
                  !isDone &&
                  t.dueDate &&
                  new Date(t.dueDate) < new Date(new Date().toDateString())
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <TaskStatusToggle id={t.id} status={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tasks/${t.id}/edit`}
                        className={`font-medium hover:text-blue-600 ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {t.title}
                      </Link>
                      {t.description && (
                        <p className="text-xs text-slate-500 truncate max-w-md">
                          {t.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-4 py-3">
                      {t.dueDate ? (
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {formatDate(t.dueDate)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {t.deal && (
                        <Link href={`/deals/${t.deal.id}`} className="hover:underline">
                          🤝 {t.deal.title}
                        </Link>
                      )}
                      {t.contact && (
                        <Link href={`/contacts/${t.contact.id}`} className="hover:underline">
                          👤 {t.contact.firstName} {t.contact.lastName}
                        </Link>
                      )}
                      {t.company && (
                        <Link href={`/companies/${t.company.id}`} className="hover:underline">
                          🏢 {t.company.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusIcon status={t.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  const colors = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  }
  const labels = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' }
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${colors[priority]}`}>
      {labels[priority]}
    </span>
  )
}

function StatusIcon({ status }: { status: 'open' | 'in_progress' | 'done' }) {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-green-600" />
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-amber-500" />
  return <Circle className="w-4 h-4 text-slate-300" />
}
