/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { calcLine } from '@/lib/utils/line-items'
import { BRAND } from '@/lib/brand'

// ── Substitution für Platzhalter in Texten ─────────────────────────────
function substitute(text: string | null | undefined, quote: any): string {
  if (!text) return ''
  const contactName = quote.contact
    ? `${quote.contact.firstName} ${quote.contact.lastName}`.trim()
    : ''
  const sccName = quote.teamMember
    ? `${quote.teamMember.firstName} ${quote.teamMember.lastName}`.trim()
    : ''
  const subs: Record<string, string> = {
    // Kunden-Daten
    'kunde.firma': quote.company?.name ?? '',
    'kunde.anrede': '',
    'kunde.vorname': quote.contact?.firstName ?? '',
    'kunde.nachname': quote.contact?.lastName ?? '',
    'kunde.name': contactName,
    'kunde.email': quote.contact?.email ?? quote.company?.email ?? '',
    'kunde.adresse': [quote.company?.city, quote.company?.country].filter(Boolean).join(', '),
    // Kurzformen
    firma: quote.company?.name ?? '',
    vorname: quote.contact?.firstName ?? '',
    nachname: quote.contact?.lastName ?? '',
    name: contactName,
    // Angebot
    datum: formatDate(quote.createdAt),
    'angebot.nummer': quote.quoteNumber ?? '',
    'angebot.gueltig_bis': quote.validUntil ? formatDate(quote.validUntil) : '',
    angebotsnummer: quote.quoteNumber ?? '',
    gueltig_bis: quote.validUntil ? formatDate(quote.validUntil) : '',
    // SCC
    'scc.name': sccName,
    'scc.email': quote.teamMember?.email ?? '',
    'scc.mobil': quote.teamMember?.mobile ?? '',
    'scc.position': quote.teamMember?.position ?? '',
    sccname: sccName,
  }
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) =>
    subs[key.toLowerCase()] ?? `{{${key}}}`)
}

function formatMoney(n: number, currency = 'EUR'): string {
  const formatted = (Number(n) || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} ${currency === 'EUR' ? '€' : currency}`
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('de-DE')
}

// ── Styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 100, // Platz für fixed footer
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#1e293b',
    lineHeight: 1.4,
  },

  // Letterhead
  letterhead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { height: 44, marginBottom: 6 },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#1e293b' },
  metaSmall: { fontSize: 8, color: '#475569', textDecoration: 'underline' },

  // Recipient + Meta
  blocks: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  blockLabel: {
    fontSize: 7,
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  recipientName: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  metaKey: { color: '#64748b', marginRight: 14, width: 95, textAlign: 'right' },
  metaVal: { fontFamily: 'Helvetica-Bold', minWidth: 90, textAlign: 'right' },
  metaSep: { borderTopWidth: 1, borderTopColor: '#cbd5e1', marginTop: 4, paddingTop: 4 },

  // Titel
  h1: { fontFamily: 'Helvetica-Bold', fontSize: 14, marginBottom: 10, color: '#1e293b' },

  // Texte
  para: { marginBottom: 8 },

  // Table
  table: { marginTop: 10 },
  trHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderTopWidth: 2,
    borderColor: '#1e293b',
    paddingVertical: 5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingVertical: 5,
  },
  trOptional: { color: '#94a3b8' },
  trText: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingVertical: 4,
    fontStyle: 'italic',
    color: '#334155',
  },

  // Column widths (sum = 100%)
  colNr:    { width: '4%' },
  colImg:   { width: '8%' },
  colName:  { width: '40%', paddingRight: 4 },
  colQty:   { width: '10%', textAlign: 'right' },
  colPrice: { width: '12%', textAlign: 'right' },
  colDisc:  { width: '7%',  textAlign: 'right' },
  colVat:   { width: '6%',  textAlign: 'right' },
  colNet:   { width: '13%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },

  itemImage: { width: 28, height: 28, objectFit: 'cover' },
  itemName: { fontFamily: 'Helvetica-Bold' },
  itemDesc: { fontSize: 8.5, color: '#475569', marginTop: 2 },

  // Totals
  totals: { marginTop: 14, alignSelf: 'flex-end', width: 240 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  totalsLabel: { color: '#475569' },
  totalsValue: { textAlign: 'right' },
  totalsFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderColor: '#1e293b',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#1e293b',
  },

  // Signatur
  sig: { marginTop: 26 },
  sigName: { fontFamily: 'Helvetica-Bold', marginTop: 8 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderColor: '#cbd5e1',
    fontSize: 7.5,
    color: '#64748b',
  },
  footerCol: { flex: 1 },
  footerHeading: { fontFamily: 'Helvetica-Bold', color: '#334155', marginBottom: 2 },

  optionalNote: { fontSize: 8, fontStyle: 'italic', color: '#64748b', marginTop: 4 },
  paymentTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 3, marginTop: 14 },
  pageNum: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 7,
    color: '#94a3b8',
  },
})

// ── Document ───────────────────────────────────────────────────────────
export function QuotePDFDocument({ quote, settings }: { quote: any; settings: any }) {
  const items = (quote.lineItems ?? []) as any[]
  const hasOptional = items.some((i) => i.isOptional)
  const subtotalNet = Number(quote.subtotalNet ?? 0)
  const globalDiscount = Number(quote.globalDiscountPercent ?? 0)
  const globalDiscountAmount = subtotalNet * (globalDiscount / 100)
  const totalVat = Number(quote.totalVat ?? 0)
  const totalGross = Number(quote.totalGross ?? 0)

  return (
    <Document title={`Angebot ${quote.quoteNumber}`} author={settings?.companyName ?? 'SCC Courts'}>
      <Page size="A4" style={s.page}>
        {/* Letterhead */}
        <View style={s.letterhead}>
          <View>
            <Image src={settings?.logoUrl || BRAND.logoUrl} style={s.logo} />
            <Text style={s.companyName}>{settings?.companyName ?? BRAND.name}</Text>
            {(settings?.companyAddress || settings?.companyZip || settings?.companyCity || settings?.companyCountry) ? (
              <Text style={s.metaSmall}>
                {[settings?.companyAddress, [settings?.companyZip, settings?.companyCity].filter(Boolean).join(' '), settings?.companyCountry].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
          <View style={{ textAlign: 'right' }}>
            {settings?.companyPhone ? <Text style={s.metaSmall}>Tel.: {settings.companyPhone}</Text> : null}
            {settings?.companyEmail ? <Text style={s.metaSmall}>{settings.companyEmail}</Text> : null}
            {settings?.companyWebsite ? <Text style={s.metaSmall}>{settings.companyWebsite}</Text> : null}
          </View>
        </View>

        {/* Recipient + Meta */}
        <View style={s.blocks}>
          <View style={{ width: '55%' }}>
            <Text style={s.blockLabel}>An</Text>
            {quote.company?.name ? (
              <Text style={s.recipientName}>{quote.company.name}</Text>
            ) : null}
            {quote.contact ? (
              <Text>z.Hd. {quote.contact.firstName} {quote.contact.lastName}</Text>
            ) : null}
            {(quote.company?.city || quote.company?.country) ? (
              <Text style={{ marginTop: 6 }}>
                {[quote.company?.city, quote.company?.country].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            {(quote.contact?.email || quote.contact?.phone || quote.contact?.mobile) ? (
              <Text style={{ color: '#475569', fontSize: 8.5 }}>
                {[quote.contact?.email, quote.contact?.phone ?? quote.contact?.mobile].filter(Boolean).join('  ·  ')}
              </Text>
            ) : null}
          </View>

          <View style={{ width: '40%' }}>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Angebots-Nr.</Text>
              <Text style={s.metaVal}>{quote.quoteNumber}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Datum</Text>
              <Text style={s.metaVal}>{formatDate(quote.createdAt)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Gültig bis</Text>
              <Text style={s.metaVal}>{formatDate(quote.validUntil)}</Text>
            </View>
            {quote.teamMember ? (
              <View style={s.metaSep}>
                <View style={s.metaRow}>
                  <Text style={s.metaKey}>Ansprechpartner</Text>
                  <Text style={s.metaVal}>
                    {quote.teamMember.firstName} {quote.teamMember.lastName}
                  </Text>
                </View>
                {quote.teamMember.email ? (
                  <View style={s.metaRow}>
                    <Text style={s.metaKey}>E-Mail</Text>
                    <Text style={s.metaVal}>{quote.teamMember.email}</Text>
                  </View>
                ) : null}
                {quote.teamMember.mobile ? (
                  <View style={s.metaRow}>
                    <Text style={s.metaKey}>Mobil</Text>
                    <Text style={s.metaVal}>{quote.teamMember.mobile}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Titel */}
        <Text style={s.h1}>Angebot — {quote.title}</Text>

        {quote.greeting ? <Text style={s.para}>{substitute(quote.greeting, quote)}</Text> : null}
        {quote.intro ? <Text style={s.para}>{substitute(quote.intro, quote)}</Text> : null}

        {/* Table */}
        <View style={s.table}>
          <View style={s.trHead} fixed>
            <Text style={s.colNr}>#</Text>
            <Text style={s.colImg}>Bild</Text>
            <Text style={s.colName}>Bezeichnung</Text>
            <Text style={s.colQty}>Menge</Text>
            <Text style={s.colPrice}>Einzel €</Text>
            <Text style={s.colDisc}>Rab%</Text>
            <Text style={s.colVat}>MwSt</Text>
            <Text style={s.colNet}>Netto €</Text>
          </View>

          {items.map((it, idx) => {
            if (it.itemType === 'text') {
              return (
                <View key={it.id} style={s.trText} wrap={false}>
                  <Text style={{ width: '100%', paddingHorizontal: 2 }}>{it.name}</Text>
                </View>
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
              <View key={it.id} style={[s.tr, it.isOptional ? s.trOptional : {}]} wrap={false}>
                <Text style={s.colNr}>{idx + 1}</Text>
                <View style={s.colImg}>
                  {it.imageUrl ? <Image src={it.imageUrl} style={s.itemImage} /> : null}
                </View>
                <View style={s.colName}>
                  <Text style={s.itemName}>
                    {it.name}{it.isOptional ? ' (optional*)' : ''}
                  </Text>
                  {it.description ? <Text style={s.itemDesc}>{it.description}</Text> : null}
                </View>
                <Text style={s.colQty}>
                  {Number(it.quantity)} {it.unit}
                </Text>
                <Text style={s.colPrice}>
                  {Number(it.unitPriceNet).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={s.colDisc}>
                  {Number(it.discountPercent) > 0 ? `${Number(it.discountPercent)}%` : '–'}
                </Text>
                <Text style={s.colVat}>{Number(it.vatRate)}%</Text>
                <Text style={s.colNet}>
                  {calc.net.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )
          })}
        </View>

        {hasOptional ? (
          <Text style={s.optionalNote}>
            * Optionale Positionen sind nicht in der Gesamtsumme enthalten.
          </Text>
        ) : null}

        {/* Totals */}
        <View style={s.totals} wrap={false}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Zwischensumme netto</Text>
            <Text style={s.totalsValue}>{formatMoney(subtotalNet)}</Text>
          </View>
          {globalDiscount > 0 ? (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>– Gesamtrabatt ({globalDiscount}%)</Text>
              <Text style={s.totalsValue}>–{formatMoney(globalDiscountAmount)}</Text>
            </View>
          ) : null}
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>MwSt</Text>
            <Text style={s.totalsValue}>{formatMoney(totalVat)}</Text>
          </View>
          <View style={s.totalsFinal}>
            <Text>Gesamtbetrag brutto</Text>
            <Text>{formatMoney(totalGross)}</Text>
          </View>
        </View>

        {/* Zahlungsbedingungen */}
        {quote.paymentTerms ? (
          <View wrap={false}>
            <Text style={s.paymentTitle}>Zahlungsbedingungen</Text>
            <Text>{substitute(quote.paymentTerms, quote)}</Text>
          </View>
        ) : null}

        {/* Footer Text */}
        {quote.footer ? <Text style={{ marginTop: 14 }}>{substitute(quote.footer, quote)}</Text> : null}

        {/* Signatur */}
        {quote.teamMember ? (
          <View style={s.sig} wrap={false}>
            <Text>Mit freundlichen Grüßen</Text>
            <Text style={s.sigName}>
              {quote.teamMember.firstName} {quote.teamMember.lastName}
            </Text>
            {quote.teamMember.position ? <Text>{quote.teamMember.position}</Text> : null}
            {quote.teamMember.email ? <Text>{quote.teamMember.email}</Text> : null}
            {quote.teamMember.mobile ? <Text>{quote.teamMember.mobile}</Text> : null}
          </View>
        ) : null}

        {/* Footer fixed (Geschäftsdaten 3-spaltig) */}
        <View style={s.footer} fixed>
          <View style={s.footerCol}>
            <Text style={s.footerHeading}>{settings?.companyName ?? ''}</Text>
            {settings?.companyAddress ? <Text>{settings.companyAddress}</Text> : null}
            {settings?.companyZip || settings?.companyCity ? (
              <Text>{[settings?.companyZip, settings?.companyCity].filter(Boolean).join(' ')}</Text>
            ) : null}
            {settings?.companyCountry ? <Text>{settings.companyCountry}</Text> : null}
            {settings?.companyRegisterNumber ? <Text>HRB: {settings.companyRegisterNumber}</Text> : null}
          </View>
          <View style={s.footerCol}>
            <Text style={s.footerHeading}>Bankverbindung</Text>
            {settings?.bankName ? <Text>{settings.bankName}</Text> : null}
            {settings?.bankIban ? <Text>IBAN: {settings.bankIban}</Text> : null}
            {settings?.bankBic ? <Text>BIC: {settings.bankBic}</Text> : null}
          </View>
          <View style={s.footerCol}>
            <Text style={s.footerHeading}>Steuer</Text>
            {settings?.taxNumber ? <Text>Steuer-Nr.: {settings.taxNumber}</Text> : null}
            {settings?.ustId ? <Text>USt-IdNr.: {settings.ustId}</Text> : null}
          </View>
        </View>

        <Text
          style={s.pageNum}
          render={({ pageNumber, totalPages }) =>
            `Seite ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
