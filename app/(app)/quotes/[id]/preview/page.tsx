/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getQuoteById } from '@/lib/db/quotes'
import { getSettings } from '@/lib/db/settings'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { calcLine } from '@/lib/utils/line-items'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { PrintButton } from '@/components/quotes/PrintButton'

// Force dynamic so we always render the latest data — no caching
export const dynamic = 'force-dynamic'

/**
 * Druck-fertige Vorschau eines Angebots.
 * Diese HTML-Seite wird in Schritt E mit @react-pdf/renderer als echtes PDF generiert.
 * Vorerst: Browser-„Drucken" → „Als PDF speichern" funktioniert genauso gut.
 */
export default async function QuotePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let quote: any
  let settings: any = null

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    quote = await getQuoteById(id)
    settings = await getSettings()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Vorschau laden" err={err} />
  }

  if (!quote) {
    return (
      <div className="p-12 text-center text-slate-500">Angebot nicht gefunden.</div>
    )
  }

  const items = (quote.lineItems ?? []) as any[]
  const hasOptional = items.some((i) => i.isOptional)

  // Platzhalter-Ersetzung in Texten (für Schritt E PDF-konform aufgebaut)
  function substitute(text: string | null | undefined): string {
    if (!text) return ''
    const subs: Record<string, string> = {
      'kunde.firma': quote.company?.name ?? '',
      'kunde.anrede': '',
      'kunde.vorname': quote.contact?.firstName ?? '',
      'kunde.nachname': quote.contact?.lastName ?? '',
      'kunde.email': quote.contact?.email ?? quote.company?.email ?? '',
      'kunde.adresse': [quote.company?.city, quote.company?.country].filter(Boolean).join(', '),
      datum: formatDate(quote.createdAt),
      'angebot.nummer': quote.quoteNumber ?? '',
      'angebot.gueltig_bis': quote.validUntil ? formatDate(quote.validUntil) : '',
      'scc.name': quote.teamMember
        ? `${quote.teamMember.firstName} ${quote.teamMember.lastName}`
        : '',
      'scc.email': quote.teamMember?.email ?? '',
      'scc.mobil': quote.teamMember?.mobile ?? '',
      'scc.position': quote.teamMember?.position ?? '',
    }
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => subs[key] ?? `{{${key}}}`)
  }

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      {/* Toolbar — nicht im Druck */}
      <div className="bg-white border-b print:hidden">
        <div className="max-w-[820px] mx-auto px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Vorschau — Angebot {quote.quoteNumber}
          </p>
          <div className="flex gap-2">
            <PrintButton />
          </div>
        </div>
      </div>

      {/* A4 Sheet */}
      <article
        className="bg-white mx-auto my-6 shadow-lg print:shadow-none print:my-0 px-12 py-10 text-[11pt] text-slate-900"
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        {/* Briefkopf */}
        <header className="flex items-start justify-between mb-10">
          <div>
            {settings?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="Logo" className="h-14 mb-3" />
            )}
            <p className="font-bold text-base">{settings?.companyName ?? 'SCC Courts'}</p>
            {settings?.companyAddress && <p className="text-xs">{settings.companyAddress}</p>}
            {(settings?.companyZip || settings?.companyCity) && (
              <p className="text-xs">
                {[settings.companyZip, settings.companyCity].filter(Boolean).join(' ')}
              </p>
            )}
            {settings?.companyCountry && <p className="text-xs">{settings.companyCountry}</p>}
          </div>
          <div className="text-right text-xs space-y-0.5">
            {settings?.companyPhone && <p>Tel.: {settings.companyPhone}</p>}
            {settings?.companyEmail && <p>{settings.companyEmail}</p>}
            {settings?.companyWebsite && <p>{settings.companyWebsite}</p>}
          </div>
        </header>

        {/* Empfänger + Meta */}
        <section className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-[8pt] uppercase tracking-wider text-slate-500 mb-1">An</p>
            <div className="text-sm space-y-0.5">
              {quote.company?.name && <p className="font-semibold">{quote.company.name}</p>}
              {quote.contact && (
                <p>{quote.contact.firstName} {quote.contact.lastName}</p>
              )}
              {(quote.company?.city || quote.company?.country) && (
                <p>{[quote.company.city, quote.company.country].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
          <div className="text-right text-xs space-y-1">
            <div className="flex justify-end gap-6">
              <span className="text-slate-500">Angebots-Nr.</span>
              <span className="font-medium">{quote.quoteNumber}</span>
            </div>
            <div className="flex justify-end gap-6">
              <span className="text-slate-500">Datum</span>
              <span>{formatDate(quote.createdAt)}</span>
            </div>
            <div className="flex justify-end gap-6">
              <span className="text-slate-500">Gültig bis</span>
              <span>{formatDate(quote.validUntil)}</span>
            </div>
            {quote.teamMember && (
              <div className="flex justify-end gap-6">
                <span className="text-slate-500">Ihr Ansprechpartner</span>
                <span>{quote.teamMember.firstName} {quote.teamMember.lastName}</span>
              </div>
            )}
          </div>
        </section>

        {/* Titel */}
        <h1 className="text-xl font-bold mb-4">Angebot — {quote.title}</h1>

        {/* Texte oben */}
        {quote.greeting && (
          <p className="whitespace-pre-wrap mb-3 text-sm">{substitute(quote.greeting)}</p>
        )}
        {quote.intro && (
          <p className="whitespace-pre-wrap mb-6 text-sm">{substitute(quote.intro)}</p>
        )}

        {/* Positionen */}
        <table className="w-full text-xs mb-2 border-collapse">
          <thead>
            <tr className="border-y border-slate-800">
              <th className="text-left py-2 w-8">Pos.</th>
              <th className="text-left py-2">Bezeichnung</th>
              <th className="text-right py-2 w-16">Menge</th>
              <th className="text-right py-2 w-20">Einzel €</th>
              <th className="text-right py-2 w-12">Rab. %</th>
              <th className="text-right py-2 w-12">MwSt</th>
              <th className="text-right py-2 w-24">Netto €</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => {
              if (it.itemType === 'text') {
                return (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td colSpan={7} className="py-2 pl-1 whitespace-pre-wrap italic text-slate-700">
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
                <tr key={it.id} className={`border-b border-slate-100 align-top ${it.isOptional ? 'text-slate-500' : ''}`}>
                  <td className="py-2">{idx + 1}</td>
                  <td className="py-2">
                    <p className="font-medium">
                      {it.name}
                      {it.isOptional && <span className="italic"> (optional*)</span>}
                    </p>
                    {it.description && (
                      <p className="text-[10pt] text-slate-600 whitespace-pre-wrap mt-0.5">
                        {it.description}
                      </p>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {Number(it.quantity)} {it.unit}
                  </td>
                  <td className="py-2 text-right">
                    {Number(it.unitPriceNet).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 text-right">
                    {Number(it.discountPercent) > 0 ? `${Number(it.discountPercent)}%` : '—'}
                  </td>
                  <td className="py-2 text-right">{Number(it.vatRate)}%</td>
                  <td className="py-2 text-right font-medium">
                    {calc.net.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {hasOptional && (
          <p className="text-[9pt] text-slate-500 italic mb-4">
            * Optionale Positionen sind nicht in der Gesamtsumme enthalten.
          </p>
        )}

        {/* Totals */}
        <section className="ml-auto w-72 text-sm mt-6 space-y-1 border-t border-slate-800 pt-3">
          <div className="flex justify-between">
            <span>Zwischensumme netto</span>
            <span>{formatCurrency(Number(quote.subtotalNet), 'EUR')}</span>
          </div>
          {Number(quote.globalDiscountPercent) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>− Gesamtrabatt ({Number(quote.globalDiscountPercent)}%)</span>
              <span>−{formatCurrency(
                Number(quote.subtotalNet) * Number(quote.globalDiscountPercent) / 100,
                'EUR'
              )}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>MwSt</span>
            <span>{formatCurrency(Number(quote.totalVat), 'EUR')}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-800">
            <span>Gesamtbetrag brutto</span>
            <span>{formatCurrency(Number(quote.totalGross), 'EUR')}</span>
          </div>
        </section>

        {/* Zahlungsbedingungen */}
        {quote.paymentTerms && (
          <section className="mt-8 text-sm whitespace-pre-wrap">
            <p className="font-semibold mb-1">Zahlungsbedingungen</p>
            <p>{substitute(quote.paymentTerms)}</p>
          </section>
        )}

        {/* Footer text */}
        {quote.footer && (
          <p className="mt-8 text-sm whitespace-pre-wrap">{substitute(quote.footer)}</p>
        )}

        {/* SCC-Ansprechpartner Signatur */}
        {quote.teamMember && (
          <section className="mt-10 text-xs">
            <p>Mit freundlichen Grüßen</p>
            <p className="font-semibold mt-3">
              {quote.teamMember.firstName} {quote.teamMember.lastName}
            </p>
            {quote.teamMember.position && <p>{quote.teamMember.position}</p>}
            {quote.teamMember.email && <p>{quote.teamMember.email}</p>}
            {quote.teamMember.mobile && <p>{quote.teamMember.mobile}</p>}
          </section>
        )}

        {/* Fuß-Streifen mit Bank/Tax */}
        <footer className="mt-12 pt-3 border-t border-slate-300 text-[9pt] text-slate-500 grid grid-cols-3 gap-4">
          <div>
            <p className="font-semibold text-slate-600">{settings?.companyName}</p>
            {settings?.companyAddress && <p>{settings.companyAddress}</p>}
            {(settings?.companyZip || settings?.companyCity) && (
              <p>{[settings?.companyZip, settings?.companyCity].filter(Boolean).join(' ')}</p>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-600">Bankverbindung</p>
            {settings?.bankName && <p>{settings.bankName}</p>}
            {settings?.bankIban && <p>IBAN: {settings.bankIban}</p>}
            {settings?.bankBic && <p>BIC: {settings.bankBic}</p>}
          </div>
          <div>
            <p className="font-semibold text-slate-600">Steuer</p>
            {settings?.taxNumber && <p>Steuer-Nr.: {settings.taxNumber}</p>}
            {settings?.ustId && <p>USt-IdNr.: {settings.ustId}</p>}
          </div>
        </footer>
      </article>
    </div>
  )
}
