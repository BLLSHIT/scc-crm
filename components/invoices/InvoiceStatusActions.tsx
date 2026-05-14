'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateInvoiceStatus } from '@/lib/actions/invoices.actions'
import type { InvoiceStatus } from '@/lib/db/invoices'

interface Props {
  invoiceId: string
  currentStatus: InvoiceStatus
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft',     label: 'Entwurf' },
  { value: 'open',      label: 'Offen' },
  { value: 'paid',      label: 'Bezahlt' },
  { value: 'overdue',   label: 'Überfällig' },
  { value: 'cancelled', label: 'Storniert' },
]

export function InvoiceStatusActions({ invoiceId, currentStatus }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState<InvoiceStatus>(currentStatus)
  const [error, setError] = useState<string | null>(null)

  function onChange(next: InvoiceStatus) {
    if (next === value) return
    setError(null)
    setValue(next)
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, next)
      if (result?.error) {
        setError(result.error._form?.[0] ?? 'Statusänderung fehlgeschlagen.')
        setValue(currentStatus)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Status</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as InvoiceStatus)}
          disabled={pending}
          className="border border-input bg-background px-3 py-1.5 text-sm rounded-md min-w-[150px]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
