'use client'
import { useRef, useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil,
  Eye,
  Download,
  Mail,
  MoreVertical,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2,
} from 'lucide-react'
import { updateQuoteStatus, deleteQuote } from '@/lib/actions/quotes.actions'
import { convertQuoteToInvoice } from '@/lib/actions/invoices.actions'
import { QuotePreviewDrawer } from '@/components/quotes/QuotePreviewDrawer'
import type { QuoteStatus } from '@/lib/db/quotes'

interface Props {
  quoteId: string
  quoteNumber: string
  currentStatus: QuoteStatus
  recipientEmail?: string | null
}

export function QuoteRowActions({
  quoteId,
  quoteNumber,
  currentStatus,
  recipientEmail,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0, openUp: false })
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 260
      setDropdownPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        right: window.innerWidth - rect.right,
        openUp,
      })
    }
    setOpen((v) => !v)
  }

  function changeStatus(next: QuoteStatus) {
    setOpen(false)
    startTransition(async () => {
      await updateQuoteStatus(quoteId, next)
      router.refresh()
    })
  }

  function handleDelete() {
    setOpen(false)
    if (!confirm(`Angebot ${quoteNumber} wirklich löschen?`)) return
    startTransition(async () => {
      await deleteQuote(quoteId)
      router.refresh()
    })
  }

  // Vorschau → Off-Canvas-Drawer (im selben Fenster)

  // Download = direkter <a download> Aufruf auf den PDF-Endpoint, kein Handler nötig

  const mailto =
    recipientEmail
      ? `mailto:${recipientEmail}?subject=${encodeURIComponent('Angebot ' + quoteNumber)}&body=${encodeURIComponent('Sehr geehrte Damen und Herren,\n\nanbei finden Sie unser Angebot ' + quoteNumber + '.\n\nMit freundlichen Grüßen\nSCC Courts')}`
      : ''

  return (
    <div className="flex items-center gap-0.5 justify-end" ref={containerRef}>
      <Link
        href={`/quotes/${quoteId}/edit`}
        title="Bearbeiten"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </Link>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        title="Vorschau"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
      >
        <Eye className="w-4 h-4" />
      </button>
      <a
        href={`/api/quotes/${quoteId}/pdf`}
        download
        title="Als PDF herunterladen"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
      >
        <Download className="w-4 h-4" />
      </a>
      {recipientEmail && (
        <a
          href={mailto}
          title={`E-Mail an ${recipientEmail}`}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
        >
          <Mail className="w-4 h-4" />
        </a>
      )}

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          title="Mehr Aktionen"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {open && (
          <div
            style={{
              position: 'fixed',
              top: dropdownPos.openUp ? undefined : dropdownPos.top,
              bottom: dropdownPos.openUp ? window.innerHeight - dropdownPos.top : undefined,
              right: dropdownPos.right,
            }}
            className="w-60 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-sm"
          >
            {currentStatus === 'draft' && (
              <button
                type="button"
                onClick={() => changeStatus('sent')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4 text-blue-600" />
                Als versendet markieren
              </button>
            )}
            {currentStatus === 'sent' && (
              <button
                type="button"
                onClick={() => changeStatus('accepted')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Als akzeptiert markieren
              </button>
            )}
            {currentStatus === 'sent' && (
              <button
                type="button"
                onClick={() => changeStatus('declined')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4 text-red-600" />
                Als abgelehnt markieren
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                if (!confirm(`Angebot ${quoteNumber} in eine Rechnung umwandeln?`)) return
                startTransition(async () => {
                  const result = await convertQuoteToInvoice(quoteId)
                  if (result.error) {
                    alert(result.error._form?.[0] ?? 'Konvertierung fehlgeschlagen.')
                    return
                  }
                  if (result.redirectTo) router.push(result.redirectTo)
                })
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              In Rechnung umwandeln
            </button>
            <div className="my-1 border-t" />
            <button
              type="button"
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </button>
          </div>
        )}
      </div>

      <QuotePreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        quoteId={quoteId}
        quoteNumber={quoteNumber}
      />
    </div>
  )
}
