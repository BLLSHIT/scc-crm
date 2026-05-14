/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjects, type ProjectStatus } from '@/lib/db/projects'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

const STATUS_FILTERS: { label: string; value?: ProjectStatus }[] = [
  { label: 'Alle' },
  { label: 'Planung', value: 'planning' },
  { label: 'Bestellt', value: 'ordered' },
  { label: 'Installation', value: 'installation' },
  { label: 'Abgeschlossen', value: 'completed' },
  { label: 'Pausiert', value: 'on_hold' },
  { label: 'Storniert', value: 'cancelled' },
]

const STATUS_BADGE: Record<ProjectStatus, string> = {
  planning: 'bg-blue-100 text-blue-700',
  ordered: 'bg-violet-100 text-violet-700',
  installation: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: 'Planung',
  ordered: 'Material bestellt',
  installation: 'In Installation',
  completed: 'Abgeschlossen',
  on_hold: 'Pausiert',
  cancelled: 'Storniert',
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: ProjectStatus }>
}) {
  const params = await searchParams
  let profile: Profile | null = null
  let projects: any[] = []
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    projects = await getProjects({ q: params.q, status: params.status })
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Projekte laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Projekte (${projects.length})`}
        profile={profile}
        actions={
          <Link href="/projects/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />Projekt
          </Link>
        }
      />
      <main className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBar placeholder="Projekte durchsuchen…" />
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => {
              const active = (params.status ?? undefined) === f.value
              const href = f.value ? `/projects?status=${f.value}` : '/projects'
              return (
                <Link key={f.label} href={href}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
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
                <th className="text-left px-4 py-3 font-medium text-slate-600">Projekt</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Kunde</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ort</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Projektleiter</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Start</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Geplantes Ende</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Auftragswert</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Keine Projekte.{' '}
                    <Link href="/projects/new" className="text-blue-600 hover:underline">
                      Erstes Projekt anlegen
                    </Link>
                  </td>
                </tr>
              )}
              {projects.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.company?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGE[p.status as ProjectStatus]}`}>
                      {STATUS_LABEL[p.status as ProjectStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.locationCity ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.teamMember ? `${p.teamMember.firstName} ${p.teamMember.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.startDate ? formatDate(p.startDate) : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.plannedEndDate ? formatDate(p.plannedEndDate) : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {p.deal?.value ? formatCurrency(Number(p.deal.value), p.deal.currency ?? 'EUR') : '—'}
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
