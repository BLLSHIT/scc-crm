'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { convertQuoteToInvoice } from '@/lib/actions/invoices.actions'

interface Props {
  quoteId: string
  quoteNumber: string
  variant?: 'button' | 'menu'
}

export function QuoteConvertToInvoice({ quoteId, quoteNumber, variant = 'button' }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function convert() {
    if (!confirm(`Angebot ${quoteNumber} in eine Rechnung umwandeln? Es wird eine neue Rechnung als Entwurf angelegt.`)) return
    setError(null)
    startTransition(async () => {
      const result = await convertQuoteToInvoice(quoteId)
      if (result.error) {
        setError(result.error._form?.[0] ?? Object.values(result.error).flat()[0] ?? 'Fehler')
        return
      }
      if (result.redirectTo) router.push(result.redirectTo)
    })
  }

  if (variant === 'menu') {
    return (
      <button type="button" onClick={convert} disabled={pending}
        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm">
        <FileText className="w-4 h-4 text-slate-500" />
        {pending ? 'Wird umgewandelt…' : 'In Rechnung umwandeln'}
      </button>
    )
  }

  return (
    <div className="space-y-1">
      <Button type="button" size="sm" onClick={convert} disabled={pending}>
        <FileText className="w-4 h-4 mr-2" />
        {pending ? 'Wird umgewandelt…' : 'In Rechnung umwandeln'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
