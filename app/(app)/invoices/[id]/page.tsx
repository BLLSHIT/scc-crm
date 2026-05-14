/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInvoiceById, type InvoiceStatus } from '@/lib/db/invoices'
import { deleteInvoice } from '@/lib/actions/invoices.actions'
import { Header } from '@/components/layout/Header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InvoiceStatusActions } from '@/components/invoices/InvoiceStatusActions'
import { InvoicePreviewTrigger } from '@/components/invoices/InvoicePreviewTrigger'
import { PaymentsCard } from '@/components/invoices/PaymentsCard'
import { Pencil, Trash2, Building2, User, UserCheck, Mail, Phone, FileText, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { calcLine } from '@/lib/utils/line-items'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
}
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Entwurf', open: 'Offen', paid: 'Bezahlt', overdue: 'Überfällig', cancelled: 'Storniert',
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let invoice: any
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    invoice = await getInvoiceById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Rechnung laden" err={err} />
  }

  if (!invoice) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Rechnung nicht gefunden.
        </div>
      </div>
    )
  }

  const status = invoice.status as InvoiceStatus
  const items = (invoice.lineItems ?? []) as any[]
  const payments = (invoice.payments ?? []) as any[]
  const totalGross = Number(invoice.totalGross ?? 0)
  const totalPaid = Number(invoice.totalPaid ?? 0)
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date(new Date().toDateString())
    && (status === 'open' || status === 'draft')

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header
          title={`${invoice.invoiceNumber} — ${invoice.title}`}
          profile={profile}
          actions={
            <div className="flex gap-2">
              <InvoicePreviewTrigger invoiceId={id} invoiceNumber={invoice.invoiceNumber} />
              <a href={`/api/invoices/${id}/pdf`} download
                className={buttonVariants({ size: 'sm' })}>
                <Download className="w-4 h-4 mr-2" />PDF
              </a>
              <Link href={`/invoices/${id}/edit`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                <Pencil className="w-4 h-4 mr-2" />Bearbeiten
              </Link>
              <form action={async () => { 'use server'; await deleteInvoice(id); redirect('/invoices') }}>
                <Button size="sm" variant="destructive" type="submit">
                  <Trash2 className="w-4 h-4 mr-2" />Löschen
                </Button>
              </form>
            </div>
          }
        />
        <main className="p-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 text-xs rounded-full border font-medium ${STATUS_BADGE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  <div className="text-xs text-slate-500">
                    Datum: <span className="font-medium text-slate-700">{formatDate(invoice.issueDate)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Fällig: <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                  {invoice.paidAt && (
                    <div className="text-xs text-slate-500">
                      Bezahlt am: <span className="text-emerald-700">{formatDate(invoice.paidAt)}</span>
                    </div>
                  )}
                </div>
                <InvoiceStatusActions invoiceId={id} currentStatus={status} />
              </CardContent>
            </Card>

            {(invoice.greeting || invoice.intro) && (
              <Card>
                <CardContent className="p-5 text-sm whitespace-pre-wrap space-y-3 text-slate-700">
                  {invoice.greeting && <p>{invoice.greeting}</p>}
                  {invoice.intro && <p>{invoice.intro}</p>}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Positionen ({items.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {items.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-400">Keine Positionen.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-y text-xs text-slate-500 uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-4 py-2 w-10">#</th>
                        <th className="text-left px-4 py-2 w-16">Bild</th>
                        <th className="text-left px-4 py-2">Bezeichnung</th>
                        <th className="text-right px-4 py-2 w-24">Menge</th>
                        <th className="text-right px-4 py-2 w-28">Einzel netto</th>
                        <th className="text-right px-4 py-2 w-20">Rabatt</th>
                        <th className="text-right px-4 py-2 w-20">MwSt</th>
                        <th className="text-right px-4 py-2 w-32">Summe netto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((it, idx) => {
                        if (it.itemType === 'text') {
                          return (
                            <tr key={it.id} className="bg-slate-50/60">
                              <td className="px-4 py-3 align-top text-slate-400">{idx + 1}</td>
                              <td colSpan={7} className="px-4 py-3 whitespace-pre-wrap italic text-slate-700">
                                {it.name}
                              </td>
                            </tr>
                          )
                        }
                        const calc = calcLine({
                          quantity: it.quantity, unitPriceNet: it.unitPriceNet,
                          discountPercent: it.discountPercent, vatRate: it.vatRate, isOptional: it.isOptional,
                        })
                        return (
                          <tr key={it.id}>
                            <td className="px-4 py-3 align-top text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3 align-top">
                              {it.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.imageUrl} alt={it.name}
                                  className="w-12 h-12 object-cover rounded border bg-slate-50" />
                              ) : <div className="w-12 h-12 rounded border bg-slate-50" />}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <p className="font-medium text-slate-900">{it.name}</p>
                              {it.description && (
                                <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{it.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              {Number(it.quantity)} <span className="text-slate-400">{it.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-right align-top">{formatCurrency(Number(it.unitPriceNet), 'EUR')}</td>
                            <td className="px-4 py-3 text-right align-top">
                              {Number(it.discountPercent) > 0 ? `${Number(it.discountPercent)}%` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right align-top">{Number(it.vatRate)}%</td>
                            <td className="px-4 py-3 text-right align-top font-medium">
                              {formatCurrency(calc.net, 'EUR')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="max-w-sm ml-auto space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Zwischensumme</span>
                    <span>{formatCurrency(Number(invoice.subtotalNet), 'EUR')}</span>
                  </div>
                  {Number(invoice.globalDiscountPercent) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>− Gesamtrabatt ({Number(invoice.globalDiscountPercent)}%)</span>
                      <span>−{formatCurrency(
                        Number(invoice.subtotalNet) * Number(invoice.globalDiscountPercent) / 100, 'EUR'
                      )}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>MwSt</span>
                    <span>{formatCurrency(Number(invoice.totalVat), 'EUR')}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-2 mt-2 border-t text-slate-900">
                    <span>Gesamtsumme brutto</span>
                    <span>{formatCurrency(totalGross, 'EUR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(invoice.paymentTerms || invoice.footer) && (
              <Card>
                <CardContent className="p-5 space-y-3 text-sm text-slate-700">
                  {invoice.paymentTerms && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Zahlungsbedingungen</p>
                      <p className="whitespace-pre-wrap">{invoice.paymentTerms}</p>
                    </div>
                  )}
                  {invoice.footer && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fußzeile</p>
                      <p className="whitespace-pre-wrap">{invoice.footer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <PaymentsCard
              invoiceId={id}
              invoiceStatus={status}
              totalGross={totalGross}
              totalPaid={totalPaid}
              payments={payments}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />Empfänger
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {invoice.company ? (
                  <Link href={`/companies/${invoice.company.id}`}
                    className="font-medium text-blue-600 hover:underline block">
                    {invoice.company.name}
                  </Link>
                ) : <p className="text-slate-400">Keine Firma verknüpft</p>}
                {invoice.contact && (
                  <Link href={`/contacts/${invoice.contact.id}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-600">
                    <User className="w-3 h-3" />
                    {invoice.contact.firstName} {invoice.contact.lastName}
                  </Link>
                )}
                {invoice.contact?.email && (
                  <a href={`mailto:${invoice.contact.email}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline text-xs">
                    <Mail className="w-3 h-3" />{invoice.contact.email}
                  </a>
                )}
                {invoice.contact?.phone && (
                  <a href={`tel:${invoice.contact.phone}`}
                    className="flex items-center gap-2 text-slate-600 text-xs">
                    <Phone className="w-3 h-3" />{invoice.contact.phone}
                  </a>
                )}
              </CardContent>
            </Card>

            {invoice.teamMember && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />Ansprechpartner SCC
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="font-medium text-slate-900">
                    {invoice.teamMember.firstName} {invoice.teamMember.lastName}
                  </p>
                  {invoice.teamMember.position && (
                    <p className="text-slate-500 text-xs">{invoice.teamMember.position}</p>
                  )}
                  {invoice.teamMember.email && (
                    <a href={`mailto:${invoice.teamMember.email}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline text-xs">
                      <Mail className="w-3 h-3" />{invoice.teamMember.email}
                    </a>
                  )}
                  {invoice.teamMember.mobile && (
                    <a href={`tel:${invoice.teamMember.mobile}`}
                      className="flex items-center gap-2 text-slate-600 text-xs">
                      <Phone className="w-3 h-3" />{invoice.teamMember.mobile}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {(invoice.quote || invoice.deal) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />Verknüpfungen
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {invoice.quote && (
                    <Link href={`/quotes/${invoice.quote.id}`} className="block text-blue-600 hover:underline">
                      Angebot: <span className="font-mono">{invoice.quote.quoteNumber}</span> — {invoice.quote.title}
                    </Link>
                  )}
                  {invoice.deal && (
                    <Link href={`/deals/${invoice.deal.id}`} className="block text-blue-600 hover:underline">
                      Deal: {invoice.deal.title}
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Info</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Nummer</span>
                  <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Erstellt</span>
                  <span>{formatDate(invoice.createdAt)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Geändert</span>
                  <span>{formatDate(invoice.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Rechnung rendern" err={err} />
  }
}
