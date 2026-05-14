'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, CheckCircle2, Circle, CalendarClock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { addMilestone, toggleMilestone, deleteMilestone } from '@/lib/actions/projects.actions'

interface Milestone {
  id: string
  title: string
  description?: string | null
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
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const completed = milestones.filter((m) => m.completedAt).length
  const total = milestones.length
  const progress = total > 0 ? (completed / total) * 100 : 0

  function handleAdd() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addMilestone(projectId, { title, dueDate, sortOrder: 0 })
      if (result.error) {
        setError(result.error._form?.[0] ?? 'Fehler.')
        return
      }
      setTitle(''); setDueDate(''); setShowForm(false)
      router.refresh()
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleMilestone(id)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Diesen Meilenstein wirklich löschen?')) return
    startTransition(async () => {
      await deleteMilestone(id)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Meilensteine ({completed}/{total})</span>
          {!showForm && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />Meilenstein
            </Button>
          )}
        </CardTitle>
        {total > 0 && (
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }} />
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
            <div className="flex items-center gap-2">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="flex-1" placeholder="Fällig am" />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAdd}>Hinzufügen</Button>
              <Button type="button" size="sm" variant="outline"
                onClick={() => { setShowForm(false); setTitle(''); setDueDate('') }}>Abbrechen</Button>
            </div>
          </div>
        )}

        {milestones.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Meilensteine.</p>
        ) : (
          <ul className="space-y-1.5">
            {milestones.map((m) => {
              const isDone = !!m.completedAt
              const isOverdue = !isDone && m.dueDate
                && new Date(m.dueDate) < new Date(new Date().toDateString())
              return (
                <li key={m.id} className="flex items-start gap-2 group p-2 -mx-2 rounded-md hover:bg-slate-50">
                  <button type="button" onClick={() => handleToggle(m.id)} className="mt-0.5">
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      : <Circle className="w-4 h-4 text-slate-300 hover:text-slate-500" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {m.title}
                    </p>
                    {m.dueDate && (
                      <p className={`text-xs flex items-center gap-1 ${
                        isOverdue ? 'text-red-600' : 'text-slate-500'
                      }`}>
                        <CalendarClock className="w-3 h-3" />
                        {formatDate(m.dueDate)}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => handleDelete(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
