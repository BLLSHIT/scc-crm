/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjects, type ProjectStatus } from '@/lib/db/projects'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { ProjectKanbanBoard } from '@/components/projects/ProjectKanbanBoard'
import { ProjectGanttCalendar } from '@/components/projects/ProjectGanttCalendar'
import { Plus, LayoutList, Kanban, CalendarDays } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

const STATUS_FILTERS: { label: string; value?: ProjectStatus }[] = [
  { label: 'Alle' },
  { label: 'Planung', value: 'planning' },
  { label: 'Bestellt', value: 'ordered' },
  { label: 'Installation', value: 'installation' },
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

type ViewMode = 'list' | 'board' | 'kalender'

function initials(tm: { firstName: string; lastName: string; abbreviation?: string | null }) {
  if (tm.abbreviation) return tm.abbreviation
  return `${tm.firstName[0] ?? ''}${tm.lastName[0] ?? ''}`.toUpperCase()
}

function MilestoneTag({ m }: { m: any }) {
  const isAufbau = m.type === 'aufbau'
  const isDone = !!m.completedAt

  if (isAufbau) {
    const start = m.dueDate ? new Date(m.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '?'
    const end = m.endDate ? new Date(m.endDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '?'
    return (
      <span className="inline-flex bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[0.68rem] font-semibold whitespace-nowrap">
        🔨 Aufbau · {start} – {end}
      </span>
    )
  }

  const date = m.dueDate ? new Date(m.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : ''
  if (isDone) {
    return (
      <span className="inline-flex bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[0.68rem] whitespace-nowrap">
        ✓ {m.title}{date ? ` · ${date}` : ''}
      </span>
    )
  }
  return (
    <span className="inline-flex bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[0.68rem] whitespace-nowrap">
      ⚑ {m.title}{date ? ` · ${date}` : ''}
    </span>
  )
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: ProjectStatus; view?: string; showCompleted?: string }>
}) {
  const params = await searchParams
  const view: ViewMode = params.view === 'board' ? 'board' : params.view === 'kalender' ? 'kalender' : 'list'
  const showCompleted = params.showCompleted === '1'

  let profile: Profile | null = null
  let projects: any[] = []
  let completedCount = 0

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    projects = await getProjects({
      q: params.q,
      status: view === 'list' ? params.status : undefined,
      showCompleted: view !== 'list' ? true : showCompleted,
    })

    if (view === 'list' && !showCompleted) {
      let countQuery = supabase
        .from('projects').select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
      if (params.q) {
        countQuery = countQuery.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`)
      }
      const { count } = await countQuery
      completedCount = count ?? 0
    }
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Projekte laden" err={err} />
  }

  function viewLink(v: ViewMode) {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    sp.set('view', v)
    if (showCompleted) sp.set('showCompleted', '1')
    return `/projects?${sp.toString()}`
  }

  function toggleCompletedLink() {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.status) sp.set('status', params.status)
    sp.set('view', 'list')
    if (!showCompleted) sp.set('showCompleted', '1')
    return `/projects?${sp.toString()}`
  }

  function statusLink(value?: ProjectStatus) {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (value) sp.set('status', value)
    if (showCompleted) sp.set('showCompleted', '1')
    const qs = sp.toString()
    return qs ? `/projects?${qs}` : '/projects'
  }

  const viewBtnBase = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors'
  const viewBtnActive = 'bg-slate-900 text-white'
  const viewBtnInactive = 'text-slate-600 hover:bg-slate-100 border border-slate-200'

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
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBar placeholder="Projekte durchsuchen…" />

          {view === 'list' && (
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map((f) => {
                const active = (params.status ?? undefined) === f.value
                const href = statusLink(f.value)
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
          )}

          {view === 'list' && (
            <Link
              href={toggleCompletedLink()}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                showCompleted
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`inline-block w-7 h-4 rounded-full transition-colors relative ${showCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${showCompleted ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </span>
              Abgeschlossene
            </Link>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Link href={viewLink('list')} className={`${viewBtnBase} ${view === 'list' ? viewBtnActive : viewBtnInactive}`}>
              <LayoutList className="w-3.5 h-3.5" />Liste
            </Link>
            <Link href={viewLink('board')} className={`${viewBtnBase} ${view === 'board' ? viewBtnActive : viewBtnInactive}`}>
              <Kanban className="w-3.5 h-3.5" />Board
            </Link>
            <Link href={viewLink('kalender')} className={`${viewBtnBase} ${view === 'kalender' ? viewBtnActive : viewBtnInactive}`}>
              <CalendarDays className="w-3.5 h-3.5" />Kalender
            </Link>
          </div>
        </div>

        {/* Hint bar for hidden completed projects */}
        {view === 'list' && !showCompleted && completedCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <span>{completedCount} abgeschlossene {completedCount === 1 ? 'Projekt' : 'Projekte'} ausgeblendet</span>
            <Link href={toggleCompletedLink()} className="underline hover:no-underline">Einblenden</Link>
          </div>
        )}

        {/* ── List View ── */}
        {view === 'list' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Projekt</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Kunde</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Bautrupp</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">PL</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Meilensteine</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Auftragswert</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        Keine Projekte.{' '}
                        <Link href="/projects/new" className="text-blue-600 hover:underline">
                          Erstes Projekt anlegen
                        </Link>
                      </td>
                    </tr>
                  )}
                  {projects.map((p: any) => {
                    const tm = p.teamMember
                    const milestones = (p.milestones ?? []).slice().sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                    const isCompleted = p.status === 'completed'
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 ${isCompleted ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.company?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGE[p.status as ProjectStatus]}`}>
                            {STATUS_LABEL[p.status as ProjectStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.buildTeam?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          {tm ? (
                            <span
                              title={`${tm.firstName} ${tm.lastName}`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#036147] text-white text-[0.68rem] font-bold"
                            >
                              {initials(tm)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {milestones.map((m: any) => (
                              <MilestoneTag key={m.id} m={m} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {p.deal?.value ? formatCurrency(Number(p.deal.value), p.deal.currency ?? 'EUR') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Board View ── */}
        {view === 'board' && <ProjectKanbanBoard initialProjects={projects} />}

        {/* ── Kalender View ── */}
        {view === 'kalender' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Projekte nach Startdatum · aktuelle 6 Monate · abgeschlossene ausgeblendet
            </p>
            <ProjectGanttCalendar projects={projects} />
          </div>
        )}
      </main>
    </div>
  )
}
