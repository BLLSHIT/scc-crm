/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getQuoteById } from '@/lib/db/quotes'
import { getSettings } from '@/lib/db/settings'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { calcLine } from '@/lib/utils/line-items'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { PrintButton } from '@/components/quotes/PrintButton'
import { AutoPrintTrigger } from '@/components/quotes/AutoPrintTrigger'

export const dynamic = 'force-dynamic'

const PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 14mm 12mm 16mm 12mm;
}
@media print {
  html, body {
    background: white !important;
    margin: 0;
    padding: 0;
  }
  .no-print { display: none !important; }
  .print-sheet {
    box-shadow: none !important;
    margin: 0 !important;
    width: auto !important;
    min-height: 0 !important;
    padding: 0 !important;
  }
  table { page-break-inside: auto; border-collapse: collapse; }
  tr    { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  .avoid-break { page-break-inside: avoid; }
}
`

export default async function QuotePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const autoPrint = sp.print === '1'

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
    return <div className="p-12 text-center text-slate-500">Angebot nicht gefunden.</div>
  }

  const items = (quote.lineItems ?? []) as any[]
  const hasOptional = items.some((i) => i.isOptional)

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
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {autoPrint && <AutoPrintTrigger />}

      <div className="flex-1 overflow-auto bg-slate-200 print:bg-white">
        {/* Toolbar (nicht im Druck) */}
        <div className="bg-white border-b no-print">
          <div className="max-w-[820px] mx-auto px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Vorschau — Angebot {quote.quoteNumber}
            </p>
            <div className="flex gap-2">
              <a
                href={`/api/quotes/${id}/pdf`}
                download
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                PDF herunterladen
              </a>
              <PrintButton />
            </div>
          </div>
        </div>

        {/* A4 Sheet */}
        <article
          className="print-sheet bg-white mx-auto my-6 shadow-lg print:shadow-none print:my-0 px-12 py-10 text-[10.5pt] text-slate-900"
          style={{ width: '210mm', minHeight: '297mm' }}
        >
          {/* Briefkopf */}
          <header className="flex items-start justify-between mb-10 avoid-break">
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
          <section className="grid grid-cols-2 gap-8 mb-8 avoid-break">
            <div>
              <p className="text-[8pt] uppercase tracking-wider text-slate-500 mb-2">An</p>
              <div className="text-sm space-y-0.5">
                {quote.company?.name && (
                  <p className="font-semibold text-base">{quote.company.name}</p>
                )}
                {quote.contact && (
                  <p>z.Hd. {quote.contact.firstName} {quote.contact.lastName}</p>
                )}
                {quote.contact?.position && (
                  <p className="text-xs text-slate-500">{quote.contact.position}</p>
                )}
                {(quote.company?.city || quote.company?.country) && (
                  <p className="mt-2">
                    {[quote.company.city, quote.company.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {quote.contact?.email && (
                  <p className="text-xs text-slate-600">{quote.contact.email}</p>
                )}
                {(quote.contact?.phone || quote.contact?.mobile) && (
                  <p className="text-xs text-slate-600">
                    {[quote.contact?.phone, quote.contact?.mobile].filter(Boolean).join(' · ')}
                  </p>
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
                <>
                  <div className="flex justify-end gap-6 pt-2 border-t mt-2">
                    <span className="text-slate-500">Ansprechpartner SCC</span>
                    <span className="font-medium">
                      {quote.teamMember.firstName} {quote.teamMember.lastName}
                    </span>
                  </div>
                  {quote.teamMember.email && (
                    <div className="flex justify-end gap-6">
                      <span className="text-slate-500">E-Mail</span>
                      <span>{quote.teamMember.email}</span>
                    </div>
                  )}
                  {quote.teamMember.mobile && (
                    <div className="flex justify-end gap-6">
                      <span className="text-slate-500">Mobil</span>
                      <span>{quote.teamMember.mobile}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <h1 className="text-xl font-bold mb-4">Angebot — {quote.title}</h1>

          {quote.greeting && (
            <p className="whitespace-pre-wrap mb-3 text-sm">{substitute(quote.greeting)}</p>
          )}
          {quote.intro && (
            <p className="whitespace-pre-wrap mb-6 text-sm">{substitute(quote.intro)}</p>
          )}

          {/* Positionen */}
          <table className="w-full text-[10pt] mb-2 border-collapse">
            <thead>
              <tr className="border-y border-slate-800">
                <th className="text-left py-2 w-7">#</th>
                <th className="text-left py-2 w-14">Bild</th>
                <th className="text-left py-2">Bezeichnung</th>
                <th className="text-right py-2 w-14">Menge</th>
                <th className="text-right py-2 w-18">Einzel €</th>
                <th className="text-right py-2 w-11">Rab%</th>
                <th className="text-right py-2 w-10">MwSt</th>
                <th className="text-right py-2 w-20">Netto €</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, idx: number) => {
                if (it.itemType === 'text') {
                  return (
                    <tr key={it.id} className="border-b border-slate-100">
                      <td colSpan={8} className="py-2 pl-1 whitespace-pre-wrap italic text-slate-700">
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
                  <tr
                    key={it.id}
                    className={`border-b border-slate-100 align-top ${it.isOptional ? 'text-slate-500' : ''}`}
                  >
                    <td className="py-2">{idx + 1}</td>
                    <td className="py-2">
                      {it.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          className="w-12 h-12 object-cover rounded border bg-slate-50"
                        />
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <p className="font-medium">
                        {it.name}
                        {it.isOptional && <span className="italic"> (optional*)</span>}
                      </p>
                      {it.description && (
                        <p className="text-[9.5pt] text-slate-600 whitespace-pre-wrap mt-0.5">
                          {it.description}
                        </p>
                      )}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {Number(it.quantity)} {it.unit}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {Number(it.unitPriceNet).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right">
                      {Number(it.discountPercent) > 0 ? `${Number(it.discountPercent)}%` : '—'}
                    </td>
                    <td className="py-2 text-right">{Number(it.vatRate)}%</td>
                    <td className="py-2 text-right font-medium whitespace-nowrap">
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
          <section className="ml-auto w-72 text-sm mt-6 space-y-1 border-t border-slate-800 pt-3 avoid-break">
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

          {quote.paymentTerms && (
            <section className="mt-8 text-sm whitespace-pre-wrap avoid-break">
              <p className="font-semibold mb-1">Zahlungsbedingungen</p>
              <p>{substitute(quote.paymentTerms)}</p>
            </section>
          )}

          {quote.footer && (
            <p className="mt-8 text-sm whitespace-pre-wrap">{substitute(quote.footer)}</p>
          )}

          {/* Signatur */}
          {quote.teamMember && (
            <section className="mt-10 text-xs avoid-break">
              <p>Mit freundlichen Grüßen</p>
              <p className="font-semibold mt-3">
                {quote.teamMember.firstName} {quote.teamMember.lastName}
              </p>
              {quote.teamMember.position && <p>{quote.teamMember.position}</p>}
              {quote.teamMember.email && <p>{quote.teamMember.email}</p>}
              {quote.teamMember.mobile && <p>{quote.teamMember.mobile}</p>}
            </section>
          )}

          {/* 3-Spalten Fußzeile mit Geschäftsdaten */}
          <footer className="mt-12 pt-3 border-t border-slate-300 text-[9pt] text-slate-500 grid grid-cols-3 gap-4 avoid-break">
            <div>
              <p className="font-semibold text-slate-700 mb-1">{settings?.companyName}</p>
              {settings?.companyAddress && <p>{settings.companyAddress}</p>}
              {(settings?.companyZip || settings?.companyCity) && (
                <p>{[settings?.companyZip, settings?.companyCity].filter(Boolean).join(' ')}</p>
              )}
              {settings?.companyCountry && <p>{settings.companyCountry}</p>}
              {settings?.companyPhone && <p>Tel.: {settings.companyPhone}</p>}
              {settings?.companyEmail && <p>{settings.companyEmail}</p>}
              {settings?.companyWebsite && <p>{settings.companyWebsite}</p>}
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Bankverbindung</p>
              {settings?.bankName && <p>{settings.bankName}</p>}
              {settings?.bankIban && <p>IBAN: {settings.bankIban}</p>}
              {settings?.bankBic && <p>BIC: {settings.bankBic}</p>}
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Steuer</p>
              {settings?.taxNumber && <p>Steuer-Nr.: {settings.taxNumber}</p>}
              {settings?.ustId && <p>USt-IdNr.: {settings.ustId}</p>}
            </div>
          </footer>
        </article>
      </div>
    </>
  )
}
