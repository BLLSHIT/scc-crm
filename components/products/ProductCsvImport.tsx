'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { importProductsCsv, type CsvImportResult } from '@/lib/actions/products.actions'

export function ProductCsvImport() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<CsvImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setResult(null)
    setError(null)
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Bitte eine CSV-Datei auswählen.')
      return
    }
    const text = await file.text()
    startTransition(async () => {
      const res = await importProductsCsv(text)
      setResult(res)
      if (res.imported > 0 || res.updated > 0) {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* CSV Vorlage herunterladen */}
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href="/api/products/export"
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          CSV exportieren / Vorlage
        </a>

        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
          isPending
            ? 'bg-slate-100 text-slate-400 cursor-wait'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}>
          <Upload className="w-3.5 h-3.5" />
          {isPending ? 'Importiere…' : 'CSV importieren'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={isPending}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      {/* Fehler */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Ergebnis */}
      {result && (
        <div className={`rounded-md border px-4 py-3 text-sm space-y-1 ${
          result.errors.length > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              {result.imported} neu importiert · {result.updated} aktualisiert
              {result.skipped > 0 && ` · ${result.skipped} übersprungen`}
            </span>
          </div>
          {result.errors.length > 0 && (
            <ul className="text-xs text-amber-700 space-y-0.5 mt-1 max-h-32 overflow-y-auto">
              {result.errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        CSV-Spalten: name, description, sku, category, unit, defaultPriceNet, purchasePriceNet, defaultVatRate, imageUrl, isActive
        <br />
        Vorhandene Produkte werden per SKU oder Name erkannt und aktualisiert.
      </p>
    </div>
  )
}
