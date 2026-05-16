'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, CheckSquare, Square, ClipboardList } from 'lucide-react'
import { addPunchItem, togglePunchItem, deletePunchItem } from '@/lib/actions/projects.actions'
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal'

interface PunchItem {
  id: string
  title: string
  isDone: boolean
  sortOrder: number
}

interface Props {
  projectId: string
  items: PunchItem[]
}

export function PunchListCard({ projectId, items }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const done = items.filter((i) => i.isDone).length
  const total = items.length

  function handleAdd() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addPunchItem(projectId, { title, sortOrder: 0 })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setTitle(''); setShowForm(false)
      router.refresh()
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await togglePunchItem(id)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Eintrag löschen?')) return
    startTransition(async () => {
      await deletePunchItem(id)
      router.refresh()
    })
  }

  const allDone = total > 0 && done === total

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            Abnahme-Checkliste ({done}/{total})
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowImport(true)}>
              <ClipboardList className="w-4 h-4 mr-1" />Vorlage laden
            </Button>
            {!showForm && (
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />Punkt
              </Button>
            )}
          </div>
        </CardTitle>
        {total > 0 && (
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {allDone && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            <CheckSquare className="w-4 h-4" />
            Alle Punkte abgehakt — Übergabe bereit!
          </div>
        )}

        {showForm && (
          <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Abnahme-Punkt"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAdd}>Hinzufügen</Button>
              <Button type="button" size="sm" variant="outline"
                onClick={() => { setShowForm(false); setTitle('') }}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Abnahmepunkte.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}
                className="flex items-center gap-2 group p-2 -mx-2 rounded-md hover:bg-slate-50">
                <button
                  type="button"
                  onClick={() => handleToggle(item.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-blue-600"
                >
                  {item.isDone
                    ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                    : <Square className="w-4 h-4" />}
                </button>
                <span className={`flex-1 text-sm ${item.isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
    </Card>
  )
}
