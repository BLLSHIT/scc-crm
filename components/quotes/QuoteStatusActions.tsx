'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateQuoteStatus } from '@/lib/actions/quotes.actions'
import { Button } from '@/components/ui/button'
import { Send, CheckCircle2, XCircle } from 'lucide-react'
import type { QuoteStatus } from '@/lib/db/quotes'

interface Props {
  quoteId: string
  currentStatus: QuoteStatus
}

export function QuoteStatusActions({ quoteId, currentStatus }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState<QuoteStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  function change(next: QuoteStatus) {
    setError(null)
    setPending(next)
    startTransition(async () => {
      const result = await updateQuoteStatus(quoteId, next)
      setPending(null)
      if (result?.error) {
        setError(result.error._form?.[0] ?? 'Statusänderung fehlgeschlagen.')
      } else {
        router.refresh()
      }
    })
  }

  // Erlaubte Übergänge:
  //   draft → sent
  //   sent → accepted | declined
  const can = {
    send:    currentStatus === 'draft',
    accept:  currentStatus === 'sent',
    decline: currentStatus === 'sent',
  }

  if (!can.send && !can.accept && !can.decline) return null

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        {can.send && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null}
            onClick={() => change('sent')}
          >
            <Send className="w-4 h-4 mr-2" />
            {pending === 'sent' ? 'Markiere…' : 'Als versendet markieren'}
          </Button>
        )}
        {can.accept && (
          <Button
            size="sm"
            disabled={pending !== null}
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => change('accepted')}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {pending === 'accepted' ? 'Markiere…' : 'Angenommen'}
          </Button>
        )}
        {can.decline && (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending !== null}
            onClick={() => change('declined')}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {pending === 'declined' ? 'Markiere…' : 'Abgelehnt'}
          </Button>
        )}
      </div>
    </div>
  )
}
