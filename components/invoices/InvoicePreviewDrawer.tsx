'use client'
import { useEffect } from 'react'
import { X, Download } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  invoiceId: string
  invoiceNumber: string
}

export function InvoicePreviewDrawer({ open, onClose, invoiceId, invoiceNumber }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative ml-auto h-full w-full max-w-5xl bg-slate-100 shadow-2xl flex flex-col">
        <header className="bg-white border-b px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-baseline gap-3 min-w-0">
            <h2 className="font-semibold text-slate-900 truncate">
              Rechnung {invoiceNumber}
            </h2>
            <span className="text-xs text-slate-500">Vorschau</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/invoices/${invoiceId}/pdf`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF herunterladen
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-100 text-slate-500"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>
        <iframe
          src={`/api/invoices/${invoiceId}/pdf?inline=1`}
          title={`Rechnung ${invoiceNumber}`}
          className="flex-1 w-full bg-white"
        />
      </aside>
    </div>
  )
}
