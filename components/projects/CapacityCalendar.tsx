'use client'
import Link from 'next/link'

interface ProjectSlim {
  id: string
  name: string
  status: string
  buildTeamId?: string | null
  buildTeam?: { id: string; name: string } | null
  startDate?: string | null
  plannedEndDate?: string | null
  actualEndDate?: string | null
}

interface Props {
  projects: ProjectSlim[]
}

const STATUS_COLOR: Record<string, string> = {
  planning:     'bg-blue-100 text-blue-700',
  ordered:      'bg-violet-100 text-violet-700',
  installation: 'bg-amber-100 text-amber-700',
  completed:    'bg-emerald-100 text-emerald-700',
  on_hold:      'bg-slate-100 text-slate-500',
  cancelled:    'bg-red-100 text-red-500',
}

function getMonths(count: number): { year: number; month: number; label: string }[] {
  const result = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    })
  }
  return result
}

function isProjectInMonth(p: ProjectSlim, year: number, month: number): boolean {
  const start = p.startDate ? new Date(p.startDate) : null
  const end = p.actualEndDate
    ? new Date(p.actualEndDate)
    : p.plannedEndDate ? new Date(p.plannedEndDate) : null
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  if (!start && !end) return false
  if (start && start > monthEnd) return false
  if (end && end < monthStart) return false
  return true
}

export function CapacityCalendar({ projects }: Props) {
  const months = getMonths(5)

  // Build team rows: group by buildTeam
  const teamMap = new Map<string, { id: string; name: string }>()
  teamMap.set('_none', { id: '_none', name: 'Kein Bauteam' })
  for (const p of projects) {
    if (p.buildTeam) {
      teamMap.set(p.buildTeam.id, p.buildTeam)
    }
  }
  const teams = Array.from(teamMap.values())

  const activeProjects = projects.filter((p) => !['cancelled'].includes(p.status))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 bg-slate-50 border border-slate-200 rounded-tl-lg font-medium text-slate-600 w-48">
              Bauteam
            </th>
            {months.map((m, i) => (
              <th
                key={`${m.year}-${m.month}`}
                className={`px-3 py-3 bg-slate-50 border-t border-b border-r border-slate-200 font-medium text-slate-600 text-center ${
                  i === months.length - 1 ? 'rounded-tr-lg' : ''
                } ${m.year === new Date().getFullYear() && m.month === new Date().getMonth() ? 'bg-blue-50' : ''}`}
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team, teamIdx) => {
            const teamProjects = team.id === '_none'
              ? activeProjects.filter((p) => !p.buildTeamId)
              : activeProjects.filter((p) => p.buildTeam?.id === team.id)

            return (
              <tr key={team.id}>
                <td className={`px-4 py-3 border-l border-b border-r border-slate-200 font-medium text-slate-700 bg-white ${
                  teamIdx === teams.length - 1 ? 'rounded-bl-lg' : ''
                }`}>
                  {team.name}
                </td>
                {months.map((m, mIdx) => {
                  const cell = teamProjects.filter((p) => isProjectInMonth(p, m.year, m.month))
                  return (
                    <td
                      key={`${m.year}-${m.month}`}
                      className={`px-2 py-2 border-b border-r border-slate-200 bg-white align-top min-w-[140px] ${
                        teamIdx === teams.length - 1 && mIdx === months.length - 1 ? 'rounded-br-lg' : ''
                      } ${m.year === new Date().getFullYear() && m.month === new Date().getMonth() ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="space-y-1">
                        {cell.map((p) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className={`block px-2 py-1 rounded text-xs truncate max-w-full hover:opacity-80 ${STATUS_COLOR[p.status] ?? 'bg-slate-100 text-slate-600'}`}
                            title={p.name}
                          >
                            {p.name}
                          </Link>
                        ))}
                        {cell.length === 0 && (
                          <span className="text-slate-200 text-xs">—</span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
