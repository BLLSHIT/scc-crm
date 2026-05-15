'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function toDateOnly(dateStr: string): Date {
  // Parse as local date (YYYY-MM-DD) to avoid timezone shifts
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isProjectActiveOnDay(project: ProjectSlim, date: Date): boolean {
  if (!project.startDate) return false
  const end = project.actualEndDate ?? project.plannedEndDate
  if (!end) return false
  const start = toDateOnly(project.startDate)
  const endDate = toDateOnly(end)
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return day >= start && day <= endDate
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  // Returns an array of dates for the full calendar grid (Mon–Sun rows)
  // Pads with nulls for days outside the month
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Monday-based: 0=Mon ... 6=Sun
  // JS getDay(): 0=Sun, 1=Mon ... 6=Sat
  const startDow = (firstDay.getDay() + 6) % 7 // 0=Mon
  const endDow = (lastDay.getDay() + 6) % 7     // 0=Mon

  const days: (Date | null)[] = []

  // Leading nulls
  for (let i = 0; i < startDow; i++) days.push(null)

  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }

  // Trailing nulls to complete the last week
  const trailing = endDow === 6 ? 0 : 6 - endDow
  for (let i = 0; i < trailing; i++) days.push(null)

  return days
}

export function CapacityCalendar({ projects }: Props) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  function goBack() {
    if (viewMonth === 0) {
      setViewYear(y => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  function goForward() {
    if (viewMonth === 11) {
      setViewYear(y => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  function goToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  })

  const calendarDays = getCalendarDays(viewYear, viewMonth)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const activeProjects = projects.filter(p => p.status !== 'cancelled')

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth()

  return (
    <div className="space-y-4">
      {/* Navigation header */}
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold text-slate-800 min-w-[180px] text-center capitalize">
          {monthLabel}
        </h2>

        <button
          onClick={goForward}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {!isCurrentMonth && (
          <button
            onClick={goToday}
            className="ml-2 px-3 py-1.5 text-sm rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            Heute
          </button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAY_LABELS.map(label => (
            <div
              key={label}
              className="px-2 py-2 text-xs font-medium text-slate-500 text-center"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-slate-200 last:border-b-0">
            {week.map((day, di) => {
              const isToday =
                day !== null &&
                day.getDate() === today.getDate() &&
                day.getMonth() === today.getMonth() &&
                day.getFullYear() === today.getFullYear()

              const dayProjects = day
                ? activeProjects.filter(p => isProjectActiveOnDay(p, day))
                : []

              return (
                <div
                  key={di}
                  className={`min-h-[80px] p-1.5 border-r border-slate-200 last:border-r-0 align-top ${
                    day === null ? 'bg-slate-50/60' : 'bg-white'
                  }`}
                >
                  {day !== null && (
                    <>
                      <div className="flex justify-end mb-1">
                        <span
                          className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-blue-500 text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayProjects.map(p => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className={`block px-1.5 py-0.5 rounded text-[11px] truncate leading-4 hover:opacity-80 ${
                              STATUS_COLOR[p.status] ?? 'bg-slate-100 text-slate-600'
                            }`}
                            title={p.name}
                          >
                            {p.name}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
