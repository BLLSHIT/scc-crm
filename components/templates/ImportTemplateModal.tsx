'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { fetchTemplateOptions, importTemplate } from '@/lib/actions/templates.actions'
import type { TemplateOptions } from '@/lib/db/templates'

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
}

export function ImportTemplateModal({ projectId, open, onClose }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [options, setOptions] = useState<TemplateOptions | null>(null)
  const [mode, setMode] = useState<'set' | 'individual'>('set')
  const [selectedSetId, setSelectedSetId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [punchlistId, setPunchlistId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && !options) {
      fetchTemplateOptions().then((opts) => {
        if (opts) setOptions(opts)
      })
    }
  }, [open, options])

  const hasSelection = mode === 'set'
    ? !!selectedSetId
    : !!(milestoneId || punchlistId || materialId)

  function handleImport() {
    if (!hasSelection) return
    setError(null); setLoading(true)

    startTransition(async () => {
      const result = await importTemplate(projectId, {
        milestoneTemplateId: mode === 'individual' ? (milestoneId || undefined) : undefined,
        punchlistTemplateId: mode === 'individual' ? (punchlistId || undefined) : undefined,
        materialTemplateId: mode === 'individual' ? (materialId || undefined) : undefined,
        mode: importMode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(mode === 'set' ? { setId: selectedSetId } as any : {}),
      })
      setLoading(false)
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler beim Import.'); return }
      router.refresh()
      onClose()
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vorlage importieren</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        {!options ? (
          <p className="text-sm text-slate-400">Vorlagen werden geladen…</p>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                onClick={() => setMode('set')}
                className={`flex-1 py-2 font-medium transition-colors ${mode === 'set' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Set importieren
              </button>
              <button
                onClick={() => setMode('individual')}
                className={`flex-1 py-2 font-medium transition-colors ${mode === 'individual' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Einzelne Vorlagen
              </button>
            </div>

            {mode === 'set' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Set</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={selectedSetId} onChange={(e) => setSelectedSetId(e.target.value)}>
                  <option value="">— Set auswählen —</option>
                  {options.sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {options.sets.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Noch keine Sets angelegt. Unter Stammdaten → Vorlagen-Sets erstellen.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meilensteine</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
                    <option value="">— keine —</option>
                    {options.milestones.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Checkliste</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={punchlistId} onChange={(e) => setPunchlistId(e.target.value)}>
                    <option value="">— keine —</option>
                    {options.punchlists.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                    <option value="">— keine —</option>
                    {options.materials.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Import mode */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Bestehende Einträge</p>
              <div className="flex gap-3">
                {(['replace', 'append'] as const).map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="importMode" value={m} checked={importMode === m}
                      onChange={() => setImportMode(m)} className="accent-blue-600" />
                    <span className="text-sm">{m === 'replace' ? 'Ersetzen' : 'Ergänzen'}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 px-4 py-2 border text-sm rounded-lg hover:bg-slate-50">
                Abbrechen
              </button>
              <button
                onClick={handleImport}
                disabled={!hasSelection || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird importiert…' : 'Importieren'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
