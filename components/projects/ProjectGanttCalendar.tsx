'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Milestone {
  id: string
  title: string
  dueDate: string | null
  endDate: string | null
  type: string
  completedAt: string | null
}

interface Project {
  id: string
  name: string
  startDate: string | null
  plannedEndDate: string | null
  buildTeam: { id: string; name: string } | null
  milestones: Milestone[]
}

interface Props {
  projects: Project[]
}

const TEAM_COLOURS = [
  '#036147',
  '#d97706',
  '#7c3aed',
  '#0369a1',
  '#be185d',
  '#065f46',
]

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function pct(date: Date, windowStart: Date, totalMs: number): number {
  return Math.max(0, Math.min(100, ((date.getTime() - windowStart.getTime()) / totalMs) * 100))
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export function ProjectGanttCalendar({ projects }: Props) {
  const [offset, setOffset] = useState(0)

  const today = useMemo(() => new Date(), [])

  const windowStart = useMemo(() => {
    const d = startOfMonth(new Date())
    return addMonths(d, offset)
  }, [offset])

  const windowEnd = useMemo(() => endOfMonth(addMonths(windowStart, 5)), [windowStart])

  const totalMs = useMemo(
    () => windowEnd.getTime() - windowStart.getTime(),
    [windowStart, windowEnd]
  )

  const todayPct = useMemo(
    () => pct(today, windowStart, totalMs),
    [today, windowStart, totalMs]
  )

  const teamColourMap = useMemo(() => {
    const names = [...new Set(projects.map(p => p.buildTeam?.name).filter(Boolean) as string[])].sort()
    const map: Record<string, string> = {}
    names.forEach((name, i) => { map[name] = TEAM_COLOURS[i % TEAM_COLOURS.length] })
    return map
  }, [projects])

  const sorted = useMemo(() =>
    [...projects]
      .filter(p => p.startDate || p.plannedEndDate)
      .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? '')),
    [projects]
  )

  const months = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addMonths(windowStart, i)),
    [windowStart]
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
        <button
          onClick={() => setOffset(o => o - 1)}
          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-900 min-w-[160px] text-center">
          {MONTH_NAMES[windowStart.getMonth()]} {windowStart.getFullYear()} –{' '}
          {MONTH_NAMES[windowEnd.getMonth()]} {windowEnd.getFullYear()}
        </span>
        <button
          onClick={() => setOffset(o => o + 1)}
          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
        <button
          onClick={() => setOffset(0)}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
        >
          Heute
        </button>

        <div className="ml-auto flex items-center gap-4 flex-wrap">
          {Object.entries(teamColourMap).map(([name, colour]) => (
            <span key={name} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colour }} />
              {name}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-amber-500 text-sm">▼</span> Meilenstein
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-sm">🔨</span> Aufbau
          </span>
        </div>
      </div>

      {/* Gantt grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 600 }}>
          {/* Month headers */}
          <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '180px repeat(6, 1fr)' }}>
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-r border-slate-100" />
            {months.map((m, i) => (
              <div
                key={i}
                className={`py-2 text-center text-xs font-semibold text-slate-500 border-r border-slate-100 last:border-r-0 ${
                  m.getMonth() === today.getMonth() && m.getFullYear() === today.getFullYear()
                    ? 'bg-blue-50 text-blue-700'
                    : ''
                }`}
              >
                {MONTH_NAMES[m.getMonth()]} {m.getFullYear()}
              </div>
            ))}
          </div>

          {sorted.length === 0 && (
            <div className="px-4 py-12 text-center text-slate-400 text-sm">
              Keine Projekte mit Datumsangaben.
            </div>
          )}
          {sorted.map((p) => {
            const colour = p.buildTeam ? (teamColourMap[p.buildTeam.name] ?? '#94a3b8') : '#94a3b8'
            const start = p.startDate ? new Date(p.startDate) : null
            const end = p.plannedEndDate ? new Date(p.plannedEndDate) : null

            const barLeft = start ? pct(start, windowStart, totalMs) : 0
            const barRight = end ? (100 - pct(end, windowStart, totalMs)) : 0
            const showBar = barLeft < 100 && barRight < 100

            const aufbau = p.milestones.find(m => m.type === 'aufbau')
            const regularMilestones = p.milestones.filter(m => m.type !== 'aufbau' && m.dueDate)

            let aufbauBar: React.ReactNode = null
            if (aufbau?.dueDate && aufbau?.endDate) {
              const aufbauStart = new Date(aufbau.dueDate)
              const aufbauEnd = new Date(aufbau.endDate)
              const aLeft = pct(aufbauStart, windowStart, totalMs)
              const aRight = 100 - pct(aufbauEnd, windowStart, totalMs)
              if (aLeft < 100 && aRight < 100) {
                aufbauBar = (
                  <div
                    className="absolute rounded"
                    style={{
                      left: `${Math.max(0, aLeft)}%`,
                      right: `${Math.max(0, aRight)}%`,
                      top: 24,
                      height: 7,
                      background: colour,
                      filter: 'brightness(0.7)',
                      minWidth: 3,
                    }}
                    title={`🔨 Aufbau: ${aufbauStart.toLocaleDateString('de-DE')} – ${aufbauEnd.toLocaleDateString('de-DE')}`}
                  />
                )
              }
            }

            return (
              <div
                key={p.id}
                className="grid border-b border-slate-50 hover:bg-slate-50 transition-colors"
                style={{ gridTemplateColumns: '180px repeat(6, 1fr)', minHeight: 52 }}
              >
                <div className="px-3 py-2 border-r border-slate-100 flex flex-col justify-center">
                  <span className="text-xs font-semibold text-slate-900 leading-tight truncate">{p.name}</span>
                  {p.buildTeam && (
                    <span className="text-[0.65rem] font-semibold mt-0.5" style={{ color: colour }}>
                      {p.buildTeam.name}
                    </span>
                  )}
                </div>

                <div className="relative col-span-6" style={{ minHeight: 52 }}>
                  {months.slice(1).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-slate-100"
                      style={{ left: `${((i + 1) / 6) * 100}%` }}
                    />
                  ))}

                  {todayPct >= 0 && todayPct <= 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-400 opacity-60 z-10"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}

                  {showBar && (
                    <div
                      className="absolute top-3 rounded flex items-center px-1.5 overflow-hidden"
                      style={{
                        left: `${barLeft}%`,
                        right: `${Math.max(0, barRight)}%`,
                        height: 18,
                        background: colour,
                        opacity: 0.85,
                        minWidth: 4,
                      }}
                      title={`${p.name}: ${start?.toLocaleDateString('de-DE') ?? '?'} – ${end?.toLocaleDateString('de-DE') ?? '?'}`}
                    >
                      <span className="text-white text-[0.6rem] font-semibold truncate">{p.name}</span>
                    </div>
                  )}

                  {aufbauBar}

                  {regularMilestones.map(m => {
                    const mDate = new Date(m.dueDate!)
                    const mLeft = pct(mDate, windowStart, totalMs)
                    if (mLeft < 0 || mLeft > 100) return null
                    const isDone = !!m.completedAt
                    return (
                      <div
                        key={m.id}
                        className="absolute text-sm leading-none z-20 cursor-default"
                        style={{
                          left: `${mLeft}%`,
                          top: 4,
                          transform: 'translateX(-50%)',
                          color: isDone ? '#16a34a' : '#f59e0b',
                        }}
                        title={`${m.title}: ${mDate.toLocaleDateString('de-DE')}${isDone ? ' ✓' : ''}`}
                      >
                        ▼
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
