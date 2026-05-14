'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, CreditCard } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { recordPayment, deletePayment } from '@/lib/actions/payments.actions'

interface Props {
  invoiceId: string
  invoiceStatus: string
  totalGross: number
  totalPaid: number
  payments: any[]
}

export function PaymentsCard({
  invoiceId, invoiceStatus, totalGross, totalPaid, payments,
}: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)
  const outstanding = totalGross - totalPaid

  const [amount, setAmount] = useState<string>(outstanding > 0 ? outstanding.toFixed(2) : '0.00')
  const [paymentDate, setPaymentDate] = useState<string>(today)
  const [paymentMethod, setPaymentMethod] = useState<string>('Überweisung')
  const [reference, setReference] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await recordPayment(invoiceId, {
        amount: Number(amount),
        paymentDate, paymentMethod, reference, notes,
      })
      if (result.error) {
        setError(result.error._form?.[0] ?? Object.values(result.error).flat()[0] ?? 'Fehler')
        return
      }
      setShowForm(false)
      setReference(''); setNotes('')
      router.refresh()
    })
  }

  function handleDelete(paymentId: string) {
    if (!confirm('Diese Zahlung wirklich löschen?')) return
    startTransition(async () => {
      await deletePayment(paymentId)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            Zahlungseingänge ({payments.length})
          </span>
          {!showForm && outstanding > 0 && invoiceStatus !== 'cancelled' && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />Zahlung erfassen
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saldo-Übersicht */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-slate-50 p-2 border">
            <p className="text-slate-500">Brutto</p>
            <p className="font-medium text-slate-900">{formatCurrency(totalGross, 'EUR')}</p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 border border-emerald-100">
            <p className="text-emerald-700">Bezahlt</p>
            <p className="font-medium text-emerald-900">{formatCurrency(totalPaid, 'EUR')}</p>
          </div>
          <div className={`rounded-md p-2 border ${outstanding > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50'}`}>
            <p className={outstanding > 0 ? 'text-amber-700' : 'text-slate-500'}>Offen</p>
            <p className={`font-medium ${outstanding > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
              {formatCurrency(Math.max(0, outstanding), 'EUR')}
            </p>
          </div>
        </div>

        {/* Erfassen-Form */}
        {showForm && (
          <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-3">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="pay-amount" className="text-xs">Betrag (€)</Label>
                <Input id="pay-amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pay-date" className="text-xs">Zahlungsdatum</Label>
                <Input id="pay-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-method" className="text-xs">Zahlungsart</Label>
              <select id="pay-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="Überweisung">Überweisung</option>
                <option value="SEPA">SEPA-Lastschrift</option>
                <option value="Bar">Bar</option>
                <option value="PayPal">PayPal</option>
                <option value="Kreditkarte">Kreditkarte</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-ref" className="text-xs">Verwendungszweck / Beleg</Label>
              <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="z.B. RE-2026-0001" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-notes" className="text-xs">Notiz (optional)</Label>
              <Input id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" size="sm" onClick={submit}>Zahlung erfassen</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
            </div>
          </div>
        )}

        {/* Liste */}
        {payments.length === 0 ? (
          <p className="text-sm text-slate-400">Keine Zahlungseingänge erfasst.</p>
        ) : (
          <ul className="divide-y -mx-3">
            {payments.map((p: any) => (
              <li key={p.id} className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">
                      {formatCurrency(Number(p.amount), 'EUR')}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(p.paymentDate)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {p.paymentMethod ?? '—'}
                    {p.reference ? ` · ${p.reference}` : ''}
                    {p.recordedByName ? ` · ${p.recordedByName}` : ''}
                  </p>
                  {p.notes && <p className="text-xs text-slate-600 mt-0.5 italic">{p.notes}</p>}
                </div>
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
