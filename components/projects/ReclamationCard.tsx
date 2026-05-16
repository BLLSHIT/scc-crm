'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addReclamation, updateReclamationStatus, deleteReclamation } from '@/lib/actions/reclamations.actions'

interface Reclamation {
  id: string
  title: string
  courtRef: string | null
  description: string | null
  status: 'open' | 'in_progress' | 'resolved'
  reportedAt: string
  resolvedAt: string | null
}

interface Props {
  projectId: string
  reclamations: Reclamation[]
}

const STATUS_LABEL = { open: 'Offen', in_progress: 'In Bearbeitung', resolved: 'Erledigt' }
const STATUS_BADGE = {
  open: 'bg-red-50 text-red-700 border border-red-200',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

export function ReclamationCard({ projectId, reclamations }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [courtRef, setCourtRef] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const openCount = reclamations.filter(r => r.status !== 'resolved').length

  function handleAdd() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addReclamation(projectId, { title, courtRef, description })
      if (result.error) { setError(result.error); return }
      setTitle(''); setCourtRef(''); setDescription(''); setShowForm(false)
      router.refresh()
    })
  }

  function handleStatusChange(id: string, status: 'open' | 'in_progress' | 'resolved') {
    startTransition(async () => {
      await updateReclamationStatus(id, projectId, status)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Reklamation wirklich löschen?')) return
    startTransition(async () => {
      await deleteReclamation(id, projectId)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100 bg-red-50/50">
        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-red-700">Reklamationen an AFP</h3>
        {openCount > 0 && (
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {openCount} offen
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowForm(s => !s)} className="ml-auto text-xs text-red-600 h-7">
          <Plus className="w-3.5 h-3.5 mr-1" /> Reklamation
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-red-100 bg-white space-y-2">
          <Input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titel der Reklamation *" className="text-sm"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={courtRef} onChange={e => setCourtRef(e.target.value)}
              placeholder="Court-Bezug (z.B. Court 2)" className="text-sm"
            />
            <Input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Kurzbeschreibung" className="text-sm"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>Hinzufügen</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setError(null) }}>Abbrechen</Button>
          </div>
        </div>
      )}

      {/* List */}
      {reclamations.length === 0 && !showForm && (
        <p className="px-4 py-6 text-sm text-slate-400 text-center">Keine Reklamationen.</p>
      )}
      {reclamations.map(r => {
        const isExpanded = expandedId === r.id
        const isResolved = r.status === 'resolved'
        return (
          <div key={r.id} className={`border-b border-slate-100 last:border-b-0 ${isResolved ? 'opacity-50' : ''}`}>
            <button
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  <span className={`text-sm font-medium text-slate-900 ${isResolved ? 'line-through' : ''}`}>
                    {r.title}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {r.courtRef && <span>{r.courtRef} · </span>}
                  Gemeldet {new Date(r.reportedAt).toLocaleDateString('de-DE')}
                  {r.resolvedAt && ` · Erledigt ${new Date(r.resolvedAt).toLocaleDateString('de-DE')}`}
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 space-y-3 bg-slate-50 border-t border-slate-100">
                {r.description && <p className="text-sm text-slate-600 pt-2">{r.description}</p>}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-slate-500 font-medium">Status:</span>
                  {(['open', 'in_progress', 'resolved'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(r.id, s)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        r.status === s ? STATUS_BADGE[s] + ' font-semibold' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="ml-auto text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
