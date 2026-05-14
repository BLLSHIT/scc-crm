/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInvoices, type InvoiceStatus } from '@/lib/db/invoices'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { InvoiceRowActions } from '@/components/invoices/InvoiceRowActions'
import type { Profile } from '@/types/app.types'

const STATUS_FILTERS: { label: string; value?: InvoiceStatus }[] = [
  { label: 'Alle' },
  { label: 'Entwurf', value: 'draft' },
  { label: 'Offen', value: 'open' },
  { label: 'Bezahlt', value: 'paid' },
  { label: 'Überfällig', value: 'overdue' },
  { label: 'Storniert', value: 'cancelled' },
]

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  open: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Entwurf',
  open: 'Offen',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: InvoiceStatus }>
}) {
  const params = await searchParams
  let profile: Profile | null = null
  let invoices: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    invoices = await getInvoices({ q: params.q, status: params.status })
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Rechnungen laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Rechnungen (${invoices.length})`}
        profile={profile}
        actions={
          <Link href="/invoices/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Rechnung
          </Link>
        }
      />
      <main className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBar placeholder="Rechnungen durchsuchen…" />
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => {
              const active = (params.status ?? undefined) === f.value
              const href = f.value ? `/invoices?status=${f.value}` : '/invoices'
              return (
                <Link key={f.label} href={href}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  {f.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Rechnungsnr.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Unternehmen</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Fällig</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Brutto</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Bezahlt</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-44">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Keine Rechnungen.{' '}
                    <Link href="/invoices/new" className="text-blue-600 hover:underline">
                      Erste Rechnung anlegen
                    </Link>
                  </td>
                </tr>
              )}
              {invoices.map((q: any) => {
                const status = q.status as InvoiceStatus
                const isOverdue = q.dueDate && new Date(q.dueDate) < new Date(new Date().toDateString()) && status === 'open'
                return (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/invoices/${q.id}`}
                        className="text-blue-600 hover:underline font-medium">
                        {q.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {q.company?.name ?? (q.contact ? `${q.contact.firstName} ${q.contact.lastName}` : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(q.issueDate)}</td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      {formatDate(q.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(Number(q.totalGross ?? 0), 'EUR')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {Number(q.totalPaid) > 0 ? formatCurrency(Number(q.totalPaid), 'EUR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceRowActions
                        invoiceId={q.id}
                        invoiceNumber={q.invoiceNumber}
                        currentStatus={status}
                        recipientEmail={q.contact?.email ?? q.company?.email ?? null}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
