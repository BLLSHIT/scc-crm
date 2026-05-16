// components/acceptance/AcceptanceDesktopOverview.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Circle, Plus, Tablet, FileText, AlertTriangle, Trash2, RotateCcw, ArrowDownToLine } from 'lucide-react'
import { addPhase, deletePhase, generateRemoteApprovalLink, reopenPhase, initProtocolFromInvoice, updateItem, recordItemPhoto } from '@/lib/actions/acceptance-protocol.actions'
import { createClient } from '@/lib/supabase/client'
import type { AcceptanceProtocol, AcceptancePhase, AcceptanceItem } from '@/lib/db/acceptance-protocol'

interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  onTabletMode: (phaseId?: string) => void
}

const PRIORITY_LABEL = { low: 'leicht', medium: 'mittel', critical: 'kritisch' }

function InlineItemEditor({
  item,
  projectId,
  onSaved,
}: {
  item: AcceptanceItem
  projectId: string
  onSaved: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<AcceptanceItem['status']>(item.status)
  const [priority, setPriority] = useState<AcceptanceItem['priority'] | ''>(item.priority ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [position, setPosition] = useState(item.position ?? '')
  const [uploading, setUploading] = useState(false)
  const [localPhotos, setLocalPhotos] = useState<Array<{
    id: string; signedUrl: string; filename: string; storagePath: string
  }>>([])
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateItem(item.id, projectId, {
        status,
        priority: (status === 'defect' && priority) ? priority as AcceptanceItem['priority'] : null,
        notes: notes || null,
        position: position || null,
      })
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Fehler')
        return
      }
      router.refresh()
      onSaved()
    })
  }

  async function handlePhoto(file: File) {
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `acceptance/${projectId}/${item.id}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage
        .from('project-attachments')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type })
      if (upErr) throw upErr
      const { data: signedData } = await supabase.storage
        .from('project-attachments')
        .createSignedUrl(storagePath, 3600)
      await recordItemPhoto(item.id, projectId, storagePath, file.name)
      if (signedData?.signedUrl) {
        setLocalPhotos(prev => [...prev, {
          id: `l-${Date.now()}`, storagePath, filename: file.name, signedUrl: signedData.signedUrl
        }])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border-t border-[#036147]/20 pt-3 mt-1 space-y-3">
      {/* Status buttons */}
      <div className="flex gap-2">
        {(['not_checked', 'ok', 'defect'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); if (s !== 'defect') setPriority('') }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
              status === s
                ? s === 'ok' ? 'bg-green-500 text-white border-green-500'
                : s === 'defect' ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {s === 'ok' ? 'OK' : s === 'defect' ? 'Mangel' : 'Offen'}
          </button>
        ))}
      </div>

      {/* Priority (only when defect) */}
      {status === 'defect' && (
        <div className="flex gap-2">
          {(['low', 'medium', 'critical'] as const).map((p) => (
            <button key={p} onClick={() => setPriority(p)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                priority === p
                  ? p === 'critical' ? 'bg-red-500 text-white border-red-500'
                  : p === 'medium' ? 'bg-orange-400 text-white border-orange-400'
                  : 'bg-yellow-400 text-slate-900 border-yellow-400'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {p === 'low' ? 'Leicht' : p === 'medium' ? 'Mittel' : 'Kritisch'}
            </button>
          ))}
        </div>
      )}

      {/* Position */}
      <input
        type="text"
        value={position}
        onChange={e => setPosition(e.target.value)}
        placeholder="Anlage / Position (z.B. Netzpfosten Nord)"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#036147]/40"
      />

      {/* Notes */}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notiz…"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs h-16 resize-none focus:outline-none focus:ring-2 focus:ring-[#036147]/40"
      />

      {/* Photos */}
      <div className="flex flex-wrap gap-2">
        {item.photos.map((ph) => (
          <div key={ph.id} className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden">
            <span className="text-xs text-slate-400">📷</span>
          </div>
        ))}
        {localPhotos.map((ph) => (
          <div key={ph.id} className="w-14 h-14 rounded-lg border border-slate-200 overflow-hidden ring-2 ring-blue-300">
            <img src={ph.signedUrl} alt={ph.filename} className="w-full h-full object-cover" />
          </div>
        ))}
        <label className={`w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#036147] transition-colors text-xs text-slate-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          📷
          <span className="text-[0.6rem]">Kamera</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.currentTarget.value = '' }} />
        </label>
        <label className={`w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#036147] transition-colors text-xs text-slate-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          🖼
          <span className="text-[0.6rem]">Datei</span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.currentTarget.value = '' }} />
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isPending} className="bg-[#036147] hover:bg-[#025038] text-white flex-1">
          {isPending ? 'Speichern…' : 'Speichern'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onSaved}>Abbrechen</Button>
      </div>
    </div>
  )
}

function PhaseCard({ phase, projectId, onTabletMode }: { phase: AcceptancePhase; projectId: string; onTabletMode: (phaseId?: string) => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [copySuccess, setCopySuccess] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

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
            <li key={item.id}>
              <div
                className={`flex items-center gap-2 ${!isComplete ? 'cursor-pointer hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors' : ''}`}
                onClick={() => {
                  if (isComplete) return
                  setExpandedItemId(expandedItemId === item.id ? null : item.id)
                }}
              >
                {item.status === 'ok'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-[#036147] flex-shrink-0" />
                  : item.status === 'defect'
                  ? <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  : <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                <span className={`text-xs ${item.status === 'ok' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {item.title}
                </span>
                {item.position && (
                  <span className="text-xs text-slate-400 truncate">{item.position}</span>
                )}
                {item.status === 'defect' && item.priority && (
                  <span className="text-xs text-orange-400">({PRIORITY_LABEL[item.priority]})</span>
                )}
                {item.photos.length > 0 && (
                  <span className="text-xs text-slate-300">📷{item.photos.length}</span>
                )}
              </div>
              {expandedItemId === item.id && (
                <InlineItemEditor
                  item={item}
                  projectId={projectId}
                  onSaved={() => setExpandedItemId(null)}
                />
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
