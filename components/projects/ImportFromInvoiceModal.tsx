'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText } from 'lucide-react'
import {
  fetchInvoicesForProject,
  importMaterialFromInvoice,
  type InvoiceOption,
} from '@/lib/actions/projects.actions'

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
}

export function ImportFromInvoiceModal({ projectId, open, onClose }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [invoices, setInvoices] = useState<InvoiceOption[] | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch on open; reset on close so next open re-fetches fresh data
  useEffect(() => {
    if (open) {
      setInvoices(null)
      setSelectedId('')
      setImportMode('append')
      setError(null)
      fetchInvoicesForProject(projectId).then(setInvoices)
    }
  }, [open, projectId])

  // Auto-select when only one invoice
  const selected: InvoiceOption | null =
    invoices?.find((inv) => inv.id === selectedId) ??
    (invoices?.length === 1 ? invoices[0] : null)
  const effectiveId = selected?.id ?? ''

  const canImport = !!effectiveId && !loading

  function handleImport() {
    if (!canImport) return
    setError(null)
    setLoading(true)
    startTransition(async () => {
      const result = await importMaterialFromInvoice(projectId, effectiveId, importMode)
      setLoading(false)
      if (result.error) {
        setError(result.error._form?.[0] ?? 'Fehler beim Import.')
        return
      }
      router.refresh()
      onClose()
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aus Rechnung importieren</h2>
          <button onClick={onClose} aria-label="Schließen" className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading */}
        {invoices === null && (
          <p className="text-sm text-slate-400">Rechnungen werden geladen…</p>
        )}

        {/* Empty state */}
        {invoices !== null && invoices.length === 0 && (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">Keine Rechnungen gefunden</p>
            <p className="text-xs text-slate-400 mt-1">
              Diesem Projekt ist kein Deal mit Rechnungen verknüpft.
            </p>
          </div>
        )}

        {/* Main content */}
        {invoices !== null && invoices.length > 0 && (
          <>
            {/* Invoice picker — only shown when multiple */}
            {invoices.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rechnung auswählen
                </label>
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <label
                      key={inv.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedId === inv.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="invoice"
                        value={inv.id}
                        checked={selectedId === inv.id}
                        onChange={() => setSelectedId(inv.id)}
                        aria-label={`${inv.invoiceNumber} – ${inv.title}`}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {inv.invoiceNumber} — {inv.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {inv.lineItems.length} Produktposition{inv.lineItems.length !== 1 ? 'en' : ''} · {inv.issueDate}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Position preview */}
            {selected && (
              <>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {selected.lineItems.length} Position{selected.lineItems.length !== 1 ? 'en' : ''} werden importiert
                  </p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_60px_60px] bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <span>Bezeichnung</span>
                      <span>Menge</span>
                      <span>Einheit</span>
                    </div>
                    {selected.lineItems.slice(0, 3).map((item, i) => (
                      <div
                        key={`${selected.id}-item-${i}`}
                        className="grid grid-cols-[1fr_60px_60px] px-3 py-2 text-sm border-t border-slate-100"
                      >
                        <span className="text-slate-900 truncate">{item.name}</span>
                        <span className="text-slate-600">{item.quantity ?? '—'}</span>
                        <span className="text-slate-600">{item.unit ?? '—'}</span>
                      </div>
                    ))}
                    {selected.lineItems.length > 3 && (
                      <div className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100 italic">
                        + {selected.lineItems.length - 3} weitere…
                      </div>
                    )}
                  </div>
                </div>

                {/* Import mode */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Import-Modus</p>
                  <div className="flex flex-col gap-2">
                    {(['append', 'replace'] as const).map((m) => (
                      <label key={m} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value={m}
                          checked={importMode === m}
                          onChange={() => setImportMode(m)}
                          aria-label={m === 'append' ? 'Anhängen' : 'Ersetzen'}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-slate-700">
                          {m === 'append' ? 'Anhängen' : 'Ersetzen'}
                          <span className="text-slate-400 ml-1 text-xs">
                            {m === 'append'
                              ? '(bestehende Einträge bleiben)'
                              : '(bestehende Einträge werden gelöscht)'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border text-sm rounded-lg hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleImport}
                disabled={!canImport}
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
