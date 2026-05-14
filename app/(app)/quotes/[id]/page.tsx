/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getQuoteById, type QuoteStatus } from '@/lib/db/quotes'
import { getActivityLogs } from '@/lib/db/activity-logs'
import { deleteQuote } from '@/lib/actions/quotes.actions'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { Header } from '@/components/layout/Header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuoteStatusActions } from '@/components/quotes/QuoteStatusActions'
import { QuotePreviewTrigger } from '@/components/quotes/QuotePreviewTrigger'
import { Pencil, Trash2, Building2, User, UserCheck, Mail, Phone, FileText, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { calcLine } from '@/lib/utils/line-items'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

const STATUS_BADGE: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  declined: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-amber-100 text-amber-700 border-amber-200',
}

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  accepted: 'Angenommen',
  declined: 'Abgelehnt',
  expired: 'Abgelaufen',
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let quote: any
  let activities: any[] = []
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    quote = await getQuoteById(id)
    activities = await getActivityLogs('quote', id, 30)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Angebot laden" err={err} />
  }

  if (!quote) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Angebot nicht gefunden.
        </div>
      </div>
    )
  }

  const status = quote.status as QuoteStatus
  const items = (quote.lineItems ?? []) as any[]

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header
          title={`${quote.quoteNumber} — ${quote.title}`}
          profile={profile}
          actions={
            <div className="flex gap-2">
              <QuotePreviewTrigger quoteId={id} quoteNumber={quote.quoteNumber} />
              <a
                href={`/api/quotes/${id}/pdf`}
                download
                className={buttonVariants({ size: 'sm' })}
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </a>
              <Link
                href={`/quotes/${id}/edit`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Bearbeiten
              </Link>
              <form
                action={async () => {
                  'use server'
                  await deleteQuote(id)
                  redirect('/quotes')
                }}
              >
                <Button size="sm" variant="destructive" type="submit">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </form>
            </div>
          }
        />
        <main className="p-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Status + Aktionen */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs rounded-full border font-medium ${STATUS_BADGE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  <div className="text-xs text-slate-500">
                    Gültig bis <span className="font-medium text-slate-700">{formatDate(quote.validUntil)}</span>
                  </div>
                  {quote.sentAt && (
                    <div className="text-xs text-slate-500">
                      Versendet: <span className="text-slate-700">{formatDate(quote.sentAt)}</span>
                    </div>
                  )}
                  {quote.acceptedAt && (
                    <div className="text-xs text-slate-500">
                      Angenommen: <span className="text-slate-700">{formatDate(quote.acceptedAt)}</span>
                    </div>
                  )}
                  {quote.declinedAt && (
                    <div className="text-xs text-slate-500">
                      Abgelehnt: <span className="text-slate-700">{formatDate(quote.declinedAt)}</span>
                    </div>
                  )}
                </div>
                <QuoteStatusActions quoteId={id} currentStatus={status} />
              </CardContent>
            </Card>

            {/* Texte (Begrüßung / Einleitung) */}
            {(quote.greeting || quote.intro) && (
              <Card>
                <CardContent className="p-5 text-sm whitespace-pre-wrap space-y-3 text-slate-700">
                  {quote.greeting && <p>{quote.greeting}</p>}
                  {quote.intro && <p>{quote.intro}</p>}
                </CardContent>
              </Card>
            )}

            {/* Line Items */}
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
                        // Freitextzeile in voller Breite
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
                          quantity: it.quantity,
                          unitPriceNet: it.unitPriceNet,
                          discountPercent: it.discountPercent,
                          vatRate: it.vatRate,
                          isOptional: it.isOptional,
                        })
                        return (
                          <tr key={it.id} className={it.isOptional ? 'bg-amber-50/40' : ''}>
                            <td className="px-4 py-3 align-top text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3 align-top">
                              {it.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={it.imageUrl}
                                  alt={it.name}
                                  className="w-12 h-12 object-cover rounded border bg-slate-50"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded border bg-slate-50" />
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <p className="font-medium text-slate-900">
                                {it.name}
                                {it.isOptional && (
                                  <span className="ml-2 text-xs text-amber-700 font-normal">
                                    (optional)
                                  </span>
                                )}
                              </p>
                              {it.description && (
                                <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">
                                  {it.description}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              {Number(it.quantity)} <span className="text-slate-400">{it.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              {formatCurrency(Number(it.unitPriceNet), 'EUR')}
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              {Number(it.discountPercent) > 0
                                ? `${Number(it.discountPercent)}%`
                                : '—'}
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

            {/* Totals */}
            <Card>
              <CardContent className="p-5">
                <div className="max-w-sm ml-auto space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Zwischensumme</span>
                    <span>{formatCurrency(Number(quote.subtotalNet), 'EUR')}</span>
                  </div>
                  {Number(quote.totalDiscount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>− Rabatt</span>
                      <span>{formatCurrency(Number(quote.totalDiscount), 'EUR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>MwSt</span>
                    <span>{formatCurrency(Number(quote.totalVat), 'EUR')}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-2 mt-2 border-t text-slate-900">
                    <span>Gesamtsumme brutto</span>
                    <span>{formatCurrency(Number(quote.totalGross), 'EUR')}</span>
                  </div>
                  {items.some((i: any) => i.isOptional) && (
                    <p className="text-xs text-amber-700 italic mt-3">
                      Optionale Positionen sind in der Gesamtsumme nicht enthalten.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Footer-Texte */}
            {(quote.paymentTerms || quote.footer) && (
              <Card>
                <CardContent className="p-5 space-y-3 text-sm text-slate-700">
                  {quote.paymentTerms && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Zahlungsbedingungen
                      </p>
                      <p className="whitespace-pre-wrap">{quote.paymentTerms}</p>
                    </div>
                  )}
                  {quote.footer && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Fußzeile
                      </p>
                      <p className="whitespace-pre-wrap">{quote.footer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Kunde */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Empfänger
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {quote.company ? (
                  <Link
                    href={`/companies/${quote.company.id}`}
                    className="font-medium text-blue-600 hover:underline block"
                  >
                    {quote.company.name}
                  </Link>
                ) : (
                  <p className="text-slate-400">Keine Firma verknüpft</p>
                )}
                {quote.contact && (
                  <Link
                    href={`/contacts/${quote.contact.id}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-600"
                  >
                    <User className="w-3 h-3" />
                    {quote.contact.firstName} {quote.contact.lastName}
                  </Link>
                )}
                {quote.contact?.email && (
                  <a
                    href={`mailto:${quote.contact.email}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline text-xs"
                  >
                    <Mail className="w-3 h-3" />
                    {quote.contact.email}
                  </a>
                )}
                {quote.contact?.phone && (
                  <a
                    href={`tel:${quote.contact.phone}`}
                    className="flex items-center gap-2 text-slate-600 text-xs"
                  >
                    <Phone className="w-3 h-3" />
                    {quote.contact.phone}
                  </a>
                )}
              </CardContent>
            </Card>

            {/* SCC Ansprechpartner */}
            {quote.teamMember && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Ansprechpartner SCC
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="font-medium text-slate-900">
                    {quote.teamMember.firstName} {quote.teamMember.lastName}
                  </p>
                  {quote.teamMember.position && (
                    <p className="text-slate-500 text-xs">{quote.teamMember.position}</p>
                  )}
                  {quote.teamMember.email && (
                    <a
                      href={`mailto:${quote.teamMember.email}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline text-xs"
                    >
                      <Mail className="w-3 h-3" />
                      {quote.teamMember.email}
                    </a>
                  )}
                  {quote.teamMember.mobile && (
                    <a
                      href={`tel:${quote.teamMember.mobile}`}
                      className="flex items-center gap-2 text-slate-600 text-xs"
                    >
                      <Phone className="w-3 h-3" />
                      {quote.teamMember.mobile}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Verknüpfter Deal */}
            {quote.deal && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Verknüpfter Deal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/deals/${quote.deal.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {quote.deal.title}
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Meta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Info</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Nummer</span>
                  <span className="font-mono font-medium">{quote.quoteNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Erstellt</span>
                  <span>{formatDate(quote.createdAt)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Geändert</span>
                  <span>{formatDate(quote.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>

            <ActivityTimeline items={activities} />
          </div>
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Angebot rendern" err={err} />
  }
}
