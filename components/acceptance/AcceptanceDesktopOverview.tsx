// components/acceptance/AcceptanceDesktopOverview.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Plus, Tablet, FileText, AlertTriangle, Trash2, RotateCcw } from 'lucide-react'
import { addPhase, deletePhase, generateRemoteApprovalLink, reopenPhase } from '@/lib/actions/acceptance-protocol.actions'
import type { AcceptanceProtocol, AcceptancePhase } from '@/lib/db/acceptance-protocol'

interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  onTabletMode: (phaseId?: string) => void
}

const PRIORITY_LABEL = { low: 'leicht', medium: 'mittel', critical: 'kritisch' }

function PhaseCard({ phase, projectId, onTabletMode }: { phase: AcceptancePhase; projectId: string; onTabletMode: (phaseId?: string) => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [copySuccess, setCopySuccess] = useState(false)

  const total = phase.items.length
  const ok = phase.items.filter((i) => i.status === 'ok').length
  const defects = phase.items.filter((i) => i.status === 'defect')
  const isComplete = !!phase.completedAt

  function handleDelete() {
    if (!confirm(`Phase "${phase.name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deletePhase(phase.id, projectId)
      router.refresh()
    })
  }

  function handleReopen() {
    if (!confirm(`Phase "${phase.name}" wieder öffnen? Unterschrift und Freigabe werden gelöscht.`)) return
    startTransition(async () => {
      await reopenPhase(phase.id, projectId)
      router.refresh()
    })
  }

  async function handleGenerateLink() {
    const result = await generateRemoteApprovalLink(phase.id, projectId)
    if (result.token) {
      const url = `${window.location.origin}/approve/${result.token}`
      await navigator.clipboard.writeText(url)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      router.refresh()
    }
  }

  return (
    <div className={`border rounded-xl p-4 ${isComplete ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isComplete
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              : <Circle className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            <span className="font-semibold text-sm text-slate-900">{phase.name}</span>
            {isComplete && <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">Abgeschlossen</Badge>}
          </div>
          <p className="text-xs text-slate-500 ml-6">
            {ok}/{total} Punkte geprüft
            {phase.completedAt && ` · ${new Date(phase.completedAt).toLocaleDateString('de-DE')}`}
            {phase.completedBy && ` · ${phase.completedBy.firstName} ${phase.completedBy.lastName}`}
          </p>
          {phase.remoteApprovedAt && (
            <p className="text-xs text-emerald-700 ml-6 mt-0.5">
              Fernfreigabe: {phase.remoteApprovedByName} · {new Date(phase.remoteApprovedAt).toLocaleDateString('de-DE')}
            </p>
          )}
          {defects.length > 0 && (
            <div className="ml-6 mt-2 flex flex-wrap gap-1">
              {defects.map((d) => (
                <span key={d.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                  d.priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                  d.priority === 'medium'   ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  ⚠ {d.title} {d.priority ? `(${PRIORITY_LABEL[d.priority]})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          {!isComplete && (
            <Button size="sm" variant="outline" onClick={() => onTabletMode(phase.id)} className="text-xs">
              <Tablet className="w-3 h-3 mr-1" /> Ausfüllen
            </Button>
          )}
          {isComplete && !phase.remoteApprovalToken && (
            <Button size="sm" variant="outline" onClick={handleGenerateLink} className="text-xs">
              🔗 Freigabe-Link
            </Button>
          )}
          {isComplete && phase.remoteApprovalToken && !phase.remoteApprovedAt && (
            <Button size="sm" variant="outline" onClick={async () => {
              const url = `${window.location.origin}/approve/${phase.remoteApprovalToken}`
              await navigator.clipboard.writeText(url)
              setCopySuccess(true)
              setTimeout(() => setCopySuccess(false), 2000)
            }} className="text-xs">
              {copySuccess ? '✓ Kopiert' : '📋 Link kopieren'}
            </Button>
          )}
          {isComplete && (
            <Button size="sm" variant="ghost" onClick={handleReopen} className="text-xs text-amber-600">
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
          {!isComplete && (
            <Button size="sm" variant="ghost" onClick={handleDelete} className="text-xs text-red-500">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function AcceptanceDesktopOverview({ protocol, projectId, onTabletMode }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allDefects = protocol.phases.flatMap((p) => p.items.filter((i) => i.status === 'defect'))

  function handleAddPhase() {
    if (!newPhaseName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addPhase(protocol.id, projectId, newPhaseName)
      if (result.error) { setError(result.error); return }
      setNewPhaseName('')
      setShowForm(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Abnahmeprotokoll</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onTabletMode()}>
            <Tablet className="w-4 h-4 mr-2" /> Tablet-Modus
          </Button>
          <Link
            href={`/api/projects/${projectId}/acceptance-pdf`}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4" /> PDF
          </Link>
        </div>
      </div>

      {/* Mängel-Zusammenfassung */}
      {allDefects.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {allDefects.length} offene Mängel
          </p>
          <ul className="mt-2 space-y-1">
            {allDefects.map((d) => (
              <li key={d.id} className="text-xs text-orange-700 flex items-center gap-2">
                <span>• {d.title}</span>
                {d.priority && <span className="text-orange-500">({PRIORITY_LABEL[d.priority]})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phasen */}
      <div className="space-y-3">
        {protocol.phases.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Noch keine Phasen. Füge eine Phase hinzu.</p>
        )}
        {protocol.phases.map((phase) => (
          <PhaseCard key={phase.id} phase={phase} projectId={projectId} onTabletMode={onTabletMode} />
        ))}
      </div>

      {/* Phase hinzufügen */}
      {showForm ? (
        <div className="flex gap-2">
          <Input
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            placeholder="Phasenname z.B. Vorabnahme"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
            className="text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleAddPhase}>Hinzufügen</Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewPhaseName('') }}>Abbrechen</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" /> Phase hinzufügen
        </Button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
