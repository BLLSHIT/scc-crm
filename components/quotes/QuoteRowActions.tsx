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
  const menuRef = useRef<HTMLDivElement>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  const mailto =
    recipientEmail
      ? `mailto:${recipientEmail}?subject=${encodeURIComponent('Angebot ' + quoteNumber)}&body=${encodeURIComponent('Sehr geehrte Damen und Herren,\n\nanbei finden Sie unser Angebot ' + quoteNumber + '.\n\nMit freundlichen Grüßen\nSCC Courts')}`
      : ''

  return (
    <div className="flex items-center gap-0.5 justify-end">
      <Link
        href={`/quotes/${quoteId}/edit`}
        title="Bearbeiten"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </Link>
      <Link
        href={`/quotes/${quoteId}`}
        title="Anzeigen"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
      >
        <Eye className="w-4 h-4" />
      </Link>
      <Link
        href={`/quotes/${quoteId}/preview`}
        target="_blank"
        title="Vorschau / Drucken"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
      >
        <Download className="w-4 h-4" />
      </Link>
      {recipientEmail && (
        <a
          href={mailto}
          title={`E-Mail an ${recipientEmail}`}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
        >
          <Mail className="w-4 h-4" />
        </a>
      )}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Mehr Aktionen"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-sm">
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
                alert('Konvertierung in Rechnung kommt in Phase 2.3.')
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
    </div>
  )
}
