// components/acceptance/AcceptanceDesktopOverview.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Circle, Plus, Tablet, FileText, AlertTriangle, Trash2, RotateCcw, ArrowDownToLine } from 'lucide-react'
import { addPhase, deletePhase, generateRemoteApprovalLink, reopenPhase, initProtocolFromInvoice } from '@/lib/actions/acceptance-protocol.actions'
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      {/* Phase-Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isComplete
            ? <CheckCircle2 className="w-4 h-4 text-[#036147] flex-shrink-0" />
            : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
          <span className="font-semibold text-sm text-slate-900 truncate">{phase.name}</span>
          {isComplete && (
            <span className="text-xs text-[#036147] font-medium flex-shrink-0">Abgeschlossen</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isComplete && (
            <Button size="sm" variant="outline" onClick={() => onTabletMode(phase.id)} className="text-xs h-7 px-2">
              <Tablet className="w-3 h-3 mr-1" /> Ausfüllen
            </Button>
          )}
          {isComplete && !phase.remoteApprovalToken && (
            <Button size="sm" variant="ghost" onClick={handleGenerateLink} className="text-xs h-7 px-2">
              🔗 Freigabe
            </Button>
          )}
          {isComplete && phase.remoteApprovalToken && !phase.remoteApprovedAt && (
            <Button size="sm" variant="ghost" onClick={async () => {
              const url = `${window.location.origin}/approve/${phase.remoteApprovalToken}`
              await navigator.clipboard.writeText(url)
              setCopySuccess(true)
              setTimeout(() => setCopySuccess(false), 2000)
            }} className="text-xs h-7 px-2">
              {copySuccess ? '✓ Kopiert' : '📋 Link'}
            </Button>
          )}
          {isComplete && (
            <Button size="sm" variant="ghost" onClick={handleReopen} className="text-xs text-amber-600 h-7 px-2">
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
          {!isComplete && (
            <Button size="sm" variant="ghost" onClick={handleDelete} className="text-xs text-red-400 h-7 px-2">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Meta */}
      <p className="text-xs text-slate-400 ml-6 mb-3">
        {ok}/{total} Punkte geprüft
        {phase.completedAt && ` · ${new Date(phase.completedAt).toLocaleDateString('de-DE')}`}
        {phase.completedBy && ` · ${phase.completedBy.firstName} ${phase.completedBy.lastName}`}
      </p>
      {phase.remoteApprovedAt && (
        <p className="text-xs text-[#036147] ml-6 mb-2">
          Fernfreigabe: {phase.remoteApprovedByName} · {new Date(phase.remoteApprovedAt).toLocaleDateString('de-DE')}
        </p>
      )}

      {/* Items-Liste */}
      {phase.items.length > 0 && (
        <ul className="ml-6 space-y-1.5">
          {phase.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              {item.status === 'ok'
                ? <CheckCircle2 className="w-3.5 h-3.5 text-[#036147] flex-shrink-0" />
                : item.status === 'defect'
                ? <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                : <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
              <span className={`text-xs ${item.status === 'ok' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {item.title}
              </span>
              {item.status === 'defect' && item.priority && (
                <span className="text-xs text-orange-400">({PRIORITY_LABEL[item.priority]})</span>
              )}
              {item.photos.length > 0 && (
                <span className="text-xs text-slate-300">📷{item.photos.length}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Defekte-Tags */}
      {defects.length > 0 && (
        <div className="ml-6 mt-2 flex flex-wrap gap-1">
          {defects.map((d) => (
            <span key={d.id} className={`text-xs px-1.5 py-0.5 rounded-full border ${
              d.priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
              d.priority === 'medium'   ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                          'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              ⚠ {d.title}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function AcceptanceDesktopOverview({ protocol, projectId, onTabletMode }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

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

  async function handleImportFromInvoice() {
    if (!confirm('Courts aus der verknüpften Rechnung als Phasen importieren? Das Protokoll darf noch keine Phasen haben.')) return
    setImporting(true)
    setError(null)
    const result = await initProtocolFromInvoice(protocol.id, projectId)
    setImporting(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Abnahmeprotokoll</h2>
        <div className="flex items-center gap-2">
          {protocol.phases.length === 0 && (
            <Button size="sm" variant="outline" onClick={handleImportFromInvoice} disabled={importing} className="text-xs">
              <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
              {importing ? 'Importiere…' : 'Aus Rechnung'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onTabletMode()}>
            <Tablet className="w-4 h-4 mr-2" /> Tablet-Modus
          </Button>
          <a
            href={`/api/projects/${projectId}/acceptance-pdf`}
            download
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4" /> PDF
          </a>
        </div>
      </div>

      {/* Mängel-Zusammenfassung */}
      {allDefects.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-orange-700 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> {allDefects.length} offene Mängel
          </p>
          <ul className="space-y-1">
            {allDefects.map((d) => (
              <li key={d.id} className="text-xs text-orange-600 flex items-center gap-2">
                <span>• {d.title}</span>
                {d.priority && <span className="text-orange-400">({PRIORITY_LABEL[d.priority]})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phasen */}
      <div className="space-y-3">
        {protocol.phases.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <p className="text-sm text-slate-400">Noch keine Phasen.</p>
            <p className="text-xs text-slate-300 mt-1">Phase manuell hinzufügen oder &quot;Aus Rechnung&quot; importieren.</p>
          </div>
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
            placeholder="Phasenname z.B. Court 1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
            className="text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleAddPhase}>Hinzufügen</Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewPhaseName('') }}>Abbrechen</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full border-dashed">
          <Plus className="w-4 h-4 mr-2" /> Phase hinzufügen
        </Button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
