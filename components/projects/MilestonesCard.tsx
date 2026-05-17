'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, CheckCircle2, Circle, CalendarClock, ListChecks, BarChart2, List } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { addMilestone, toggleMilestone, deleteMilestone, updateMilestoneDates } from '@/lib/actions/projects.actions'
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal'
import { MilestoneGantt } from '@/components/projects/MilestoneGantt'

interface Milestone {
  id: string
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  completedAt?: string | null
  sortOrder: number
}

interface Props {
  projectId: string
  milestones: Milestone[]
}

export function MilestonesCard({ projectId, milestones }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'gantt'>('list')
  const [scale, setScale] = useState<'kw' | 'mon'>('kw')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const completed = milestones.filter((m) => m.completedAt).length
  const total = milestones.length
  const progress = total > 0 ? (completed / total) * 100 : 0

  function handleAdd() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addMilestone(projectId, {
        title,
        description,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        sortOrder: 0,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setTitle(''); setDescription(''); setStartDate(''); setDueDate(''); setShowForm(false)
      router.refresh()
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => { await toggleMilestone(id); router.refresh() })
  }

  function handleDelete(id: string) {
    if (!confirm('Diesen Meilenstein wirklich löschen?')) return
    startTransition(async () => { await deleteMilestone(id); router.refresh() })
  }

  function handleDatesChange(id: string, newStart: string | null, newDue: string) {
    startTransition(async () => { await updateMilestoneDates(id, newStart, newDue); router.refresh() })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Meilensteine ({completed}/{total})</span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Liste / Gantt toggle */}
            <div className="flex bg-slate-100 rounded-md p-0.5 gap-0.5">
              <Button
                type="button" size="sm" variant={view === 'list' ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setView('list')}
              >
                <List className="w-3 h-3 mr-1" />Liste
              </Button>
              <Button
                type="button" size="sm" variant={view === 'gantt' ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setView('gantt')}
              >
                <BarChart2 className="w-3 h-3 mr-1" />Gantt
              </Button>
            </div>

            {/* KW / Mon toggle — only visible in Gantt view */}
            {view === 'gantt' && (
              <div className="flex bg-slate-100 rounded-md p-0.5 gap-0.5">
                <Button
                  type="button" size="sm" variant={scale === 'kw' ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setScale('kw')}
                >KW</Button>
                <Button
                  type="button" size="sm" variant={scale === 'mon' ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setScale('mon')}
                >Mon</Button>
              </div>
            )}

            <Button type="button" size="sm" variant="outline" onClick={() => setShowImport(true)}>
              <ListChecks className="w-4 h-4 mr-1" />Vorlage laden
            </Button>
            {!showForm && (
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />Meilenstein
              </Button>
            )}
          </div>
        </CardTitle>
        {total > 0 && (
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {showForm && (
          <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel des Meilensteins" autoFocus />
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung (optional)" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                aria-label="Von (optional)" />
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                aria-label="Bis / Fällig am" />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAdd}>Hinzufügen</Button>
              <Button type="button" size="sm" variant="outline"
                onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setStartDate(''); setDueDate('') }}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {milestones.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Meilensteine.</p>
        ) : view === 'gantt' ? (
          <MilestoneGantt milestones={milestones} scale={scale} onDatesChange={handleDatesChange} />
        ) : (
          <ul className="space-y-1.5">
            {milestones.map((m) => {
              const isDone = !!m.completedAt
              const isOverdue = !isDone && m.dueDate
                && new Date(m.dueDate) < new Date(new Date().toDateString())
              const dateLabel = m.startDate && m.dueDate
                ? `${formatDate(m.startDate)} – ${formatDate(m.dueDate)}`
                : m.dueDate ? formatDate(m.dueDate) : null
              return (
                <li key={m.id}
                  className="flex items-start gap-2 group p-2 -mx-2 rounded-md hover:bg-slate-50">
                  <button type="button" onClick={() => handleToggle(m.id)} className="mt-0.5 flex-shrink-0"
                    aria-label={isDone ? 'Meilenstein als offen markieren' : 'Meilenstein abhaken'}>
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      : <Circle className="w-4 h-4 text-slate-300 hover:text-slate-500" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {m.title}
                    </p>
                    {m.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                    )}
                    {dateLabel && (
                      <p className={`text-xs flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                        <CalendarClock className="w-3 h-3" />{dateLabel}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => handleDelete(m.id)}
                    aria-label="Meilenstein löschen"
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
      <ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
    </Card>
  )
}
