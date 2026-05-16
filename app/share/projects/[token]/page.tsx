/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getProjectByShareToken } from '@/lib/db/projects'
import { CheckCircle2, Circle, MapPin, CalendarClock, Building2, ClipboardList } from 'lucide-react'
import { SharePasswordForm } from '@/components/projects/SharePasswordForm'

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE')
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  planning:     { label: 'In Planung',       cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  ordered:      { label: 'Material bestellt', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  installation: { label: 'In Installation',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed:    { label: 'Abgeschlossen',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  on_hold:      { label: 'Pausiert',          cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled:    { label: 'Storniert',         cls: 'bg-red-100 text-red-700 border-red-200' },
}

export default async function ShareProjectPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Public read via service role (no auth required for shared projects)
  // We use createClient here but the project lookup is via shareToken — safe.
  const supabase = await createClient()

  // Directly query via supabase (bypassing auth) using shareToken
  const { data: projectRaw } = await supabase
    .from('projects')
    .select(`
      id, name, status, startDate, plannedEndDate, locationStreet, locationZip, locationCity, locationCountry, shareLinkPassword,
      company:companies(id, name),
      teamMember:team_members(id, firstName, lastName)
    `)
    .eq('shareToken', token)
    .single()

  if (!projectRaw) notFound()

  const sharePw = (projectRaw as any).shareLinkPassword as string | null
  if (sharePw) {
    const cookieStore = await cookies()
    const auth = cookieStore.get(`share_auth_${token}`)
    if (auth?.value !== 'ok') {
      return <SharePasswordForm token={token} />
    }
  }

  const [milestonesRes, punchRes] = await Promise.all([
    supabase.from('project_milestones').select('id, title, completedAt, dueDate, sortOrder')
      .eq('projectId', projectRaw.id).order('sortOrder', { ascending: true }),
    supabase.from('project_punch_items').select('id, title, isDone, sortOrder')
      .eq('projectId', projectRaw.id).order('sortOrder', { ascending: true }),
  ])

  const project = projectRaw as any
  const milestones: any[] = milestonesRes.data ?? []
  const punchItems: any[] = punchRes.data ?? []
  const completedMs = milestones.filter((m) => m.completedAt).length
  const progress = milestones.length > 0 ? (completedMs / milestones.length) * 100 : 0
  const badge = STATUS_BADGE[project.status] ?? { label: project.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#036147]">SCC Courts</span>
          <span className="text-xs text-slate-400">Projektfreigabe</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Header card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
            <span className={`px-3 py-1 text-xs rounded-full border font-medium flex-shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {project.company && (
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400" />
                {project.company.name}
              </div>
            )}
            {(project.locationCity || project.locationStreet) && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                {[project.locationStreet, [project.locationZip, project.locationCity].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
              </div>
            )}
            {project.startDate && (
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarClock className="w-4 h-4 text-slate-400" />
                Start: {formatDate(project.startDate)}
              </div>
            )}
            {project.plannedEndDate && (
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarClock className="w-4 h-4 text-slate-400" />
                Datum Übergabe: {formatDate(project.plannedEndDate)}
              </div>
            )}
          </div>

          {milestones.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Meilensteine</span>
                <span>{completedMs}/{milestones.length}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#036147] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Meilensteine */}
        {milestones.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Meilensteine</h2>
            <ul className="space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-start gap-3">
                  {m.completedAt
                    ? <CheckCircle2 className="w-4 h-4 text-[#036147] flex-shrink-0 mt-0.5" />
                    : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-sm ${m.completedAt ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {m.title}
                    </p>
                    {m.dueDate && !m.completedAt && (
                      <p className="text-xs text-slate-400 mt-0.5">Fällig: {formatDate(m.dueDate)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Abnahme-Checkliste */}
        {punchItems.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              Abnahme-Checkliste ({punchItems.filter((p) => p.isDone).length}/{punchItems.length})
            </h2>
            <ul className="space-y-2">
              {punchItems.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  {p.isDone
                    ? <CheckCircle2 className="w-4 h-4 text-[#036147] flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                  <span className={`text-sm ${p.isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {p.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pt-4">
          Diese Seite wurde von SCC Courts mit Ihnen geteilt. · {new Date().getFullYear()}
        </p>
      </main>
    </div>
  )
}
