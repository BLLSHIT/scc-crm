/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { calcLine } from '@/lib/utils/line-items'
import { BRAND } from '@/lib/brand'

function substitute(text: string | null | undefined, invoice: any): string {
  if (!text) return ''
  const subs: Record<string, string> = {
    'kunde.firma': invoice.company?.name ?? '',
    'kunde.anrede': '',
    'kunde.vorname': invoice.contact?.firstName ?? '',
    'kunde.nachname': invoice.contact?.lastName ?? '',
    'kunde.email': invoice.contact?.email ?? invoice.company?.email ?? '',
    'kunde.adresse': [invoice.company?.city, invoice.company?.country].filter(Boolean).join(', '),
    datum: formatDate(invoice.issueDate),
    'rechnung.nummer': invoice.invoiceNumber ?? '',
    'rechnung.faellig': invoice.dueDate ? formatDate(invoice.dueDate) : '',
    'scc.name': invoice.teamMember ? `${invoice.teamMember.firstName} ${invoice.teamMember.lastName}` : '',
    'scc.email': invoice.teamMember?.email ?? '',
    'scc.mobil': invoice.teamMember?.mobile ?? '',
    'scc.position': invoice.teamMember?.position ?? '',
  }
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => subs[key] ?? `{{${key}}}`)
}

function formatMoney(n: number, currency = 'EUR'): string {
  const formatted = (Number(n) || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
  return `${formatted} ${currency === 'EUR' ? '€' : currency}`
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('de-DE')
}

const s = StyleSheet.create({
  page: {
    paddingTop: 36, paddingBottom: 80, paddingHorizontal: 40,
    fontFamily: 'Helvetica', fontSize: 9.5, color: '#1e293b', lineHeight: 1.4,
  },
  letterhead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { height: 44, marginBottom: 6 },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#036147' },
  metaSmall: { fontSize: 8, color: '#475569' },

  blocks: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  blockLabel: { fontSize: 7, color: '#64748b', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  recipientName: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  metaKey: { color: '#64748b', marginRight: 14, width: 95, textAlign: 'right' },
  metaVal: { fontFamily: 'Helvetica-Bold', minWidth: 90, textAlign: 'right' },
  metaSep: { borderTopWidth: 1, borderTopColor: '#cbd5e1', marginTop: 4, paddingTop: 4 },

  h1: { fontFamily: 'Helvetica-Bold', fontSize: 14, marginBottom: 10, color: '#036147' },
  para: { marginBottom: 8 },

  table: { marginTop: 10 },
  trHead: {
    flexDirection: 'row', borderBottomWidth: 1, borderTopWidth: 2, borderColor: '#036147',
    paddingVertical: 5, fontFamily: 'Helvetica-Bold', color: '#036147',
  },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#e2e8f0', paddingVertical: 5 },
  trText: {
    flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#e2e8f0', paddingVertical: 4,
    fontStyle: 'italic', color: '#334155',
  },

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

  totals: { marginTop: 14, alignSelf: 'flex-end', width: 240 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  totalsLabel: { color: '#475569' },
  totalsValue: { textAlign: 'right' },
  totalsFinal: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 6, marginTop: 4, borderTopWidth: 2, borderColor: '#036147',
    fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#036147',
  },
  paidNote: {
    marginTop: 6, padding: 4, backgroundColor: '#ecfdf5',
    color: '#047857', fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center',
  },

  sig: { marginTop: 26 },
  sigName: { fontFamily: 'Helvetica-Bold', marginTop: 8 },

  footer: {
    position: 'absolute', bottom: 24, left: 40, right: 40,
    flexDirection: 'row', paddingTop: 6, borderTopWidth: 0.5, borderColor: '#cbd5e1',
    fontSize: 7.5, color: '#64748b',
  },
  footerCol: { flex: 1 },
  footerHeading: { fontFamily: 'Helvetica-Bold', color: '#334155', marginBottom: 2 },

  paymentTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 3, marginTop: 14 },
  pageNum: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    textAlign: 'center', fontSize: 7, color: '#94a3b8',
  },
})

export function InvoicePDFDocument({ invoice, settings }: { invoice: any; settings: any }) {
  const items = (invoice.lineItems ?? []) as any[]
  const subtotalNet = Number(invoice.subtotalNet ?? 0)
  const globalDiscount = Number(invoice.globalDiscountPercent ?? 0)
  const globalDiscountAmount = subtotalNet * (globalDiscount / 100)
  const totalVat = Number(invoice.totalVat ?? 0)
  const totalGross = Number(invoice.totalGross ?? 0)
  const totalPaid = Number(invoice.totalPaid ?? 0)
  const isPaid = invoice.status === 'paid'
  const outstanding = totalGross - totalPaid

  return (
    <Document title={`Rechnung ${invoice.invoiceNumber}`} author={settings?.companyName ?? 'SCC Courts'}>
      <Page size="A4" style={s.page}>
        <View style={s.letterhead}>
          <View>
            <Image src={settings?.logoUrl || BRAND.logoUrl} style={s.logo} />
            <Text style={s.companyName}>{settings?.companyName ?? BRAND.name}</Text>
            {settings?.companyAddress ? <Text style={s.metaSmall}>{settings.companyAddress}</Text> : null}
            {settings?.companyZip || settings?.companyCity ? (
              <Text style={s.metaSmall}>
                {[settings?.companyZip, settings?.companyCity].filter(Boolean).join(' ')}
              </Text>
            ) : null}
            {settings?.companyCountry ? <Text style={s.metaSmall}>{settings.companyCountry}</Text> : null}
          </View>
          <View style={{ textAlign: 'right' }}>
            {settings?.companyPhone ? <Text style={s.metaSmall}>Tel.: {settings.companyPhone}</Text> : null}
            {settings?.companyEmail ? <Text style={s.metaSmall}>{settings.companyEmail}</Text> : null}
            {settings?.companyWebsite ? <Text style={s.metaSmall}>{settings.companyWebsite}</Text> : null}
          </View>
        </View>

        <View style={s.blocks}>
          <View style={{ width: '55%' }}>
            <Text style={s.blockLabel}>An</Text>
            {invoice.company?.name ? <Text style={s.recipientName}>{invoice.company.name}</Text> : null}
            {invoice.contact ? (
              <Text>z.Hd. {invoice.contact.firstName} {invoice.contact.lastName}</Text>
            ) : null}
            {invoice.contact?.position ? (
              <Text style={{ color: '#64748b', fontSize: 8.5 }}>{invoice.contact.position}</Text>
            ) : null}
            {(invoice.company?.city || invoice.company?.country) ? (
              <Text style={{ marginTop: 6 }}>
                {[invoice.company?.city, invoice.company?.country].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            {invoice.contact?.email ? (
              <Text style={{ color: '#475569', fontSize: 8.5 }}>{invoice.contact.email}</Text>
            ) : null}
          </View>

          <View style={{ width: '40%' }}>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Rechnungs-Nr.</Text>
              <Text style={s.metaVal}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Datum</Text>
              <Text style={s.metaVal}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Fällig am</Text>
              <Text style={s.metaVal}>{formatDate(invoice.dueDate)}</Text>
            </View>
            {invoice.teamMember ? (
              <View style={s.metaSep}>
                <View style={s.metaRow}>
                  <Text style={s.metaKey}>Ansprechpartner</Text>
                  <Text style={s.metaVal}>
                    {invoice.teamMember.firstName} {invoice.teamMember.lastName}
                  </Text>
                </View>
                {invoice.teamMember.email ? (
                  <View style={s.metaRow}>
                    <Text style={s.metaKey}>E-Mail</Text>
                    <Text style={s.metaVal}>{invoice.teamMember.email}</Text>
                  </View>
                ) : null}
                {invoice.teamMember.mobile ? (
                  <View style={s.metaRow}>
                    <Text style={s.metaKey}>Mobil</Text>
                    <Text style={s.metaVal}>{invoice.teamMember.mobile}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <Text style={s.h1}>Rechnung — {invoice.title}</Text>

        {invoice.greeting ? <Text style={s.para}>{substitute(invoice.greeting, invoice)}</Text> : null}
        {invoice.intro ? <Text style={s.para}>{substitute(invoice.intro, invoice)}</Text> : null}

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
              quantity: it.quantity, unitPriceNet: it.unitPriceNet,
              discountPercent: it.discountPercent, vatRate: it.vatRate, isOptional: it.isOptional,
            })
            return (
              <View key={it.id} style={s.tr} wrap={false}>
                <Text style={s.colNr}>{idx + 1}</Text>
                <View style={s.colImg}>
                  {it.imageUrl ? <Image src={it.imageUrl} style={s.itemImage} /> : null}
                </View>
                <View style={s.colName}>
                  <Text style={s.itemName}>{it.name}</Text>
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
            <Text>Rechnungsbetrag brutto</Text>
            <Text>{formatMoney(totalGross)}</Text>
          </View>
          {totalPaid > 0 ? (
            <>
              <View style={[s.totalsRow, { marginTop: 4 }]}>
                <Text style={s.totalsLabel}>davon bereits bezahlt</Text>
                <Text style={s.totalsValue}>–{formatMoney(totalPaid)}</Text>
              </View>
              {!isPaid && outstanding > 0 ? (
                <View style={[s.totalsRow, { fontFamily: 'Helvetica-Bold' }]}>
                  <Text>Offener Betrag</Text>
                  <Text>{formatMoney(outstanding)}</Text>
                </View>
              ) : null}
            </>
          ) : null}
          {isPaid ? (
            <Text style={s.paidNote}>BEZAHLT{invoice.paidAt ? ` AM ${formatDate(invoice.paidAt)}` : ''}</Text>
          ) : null}
        </View>

        {invoice.paymentTerms ? (
          <View wrap={false}>
            <Text style={s.paymentTitle}>Zahlungsbedingungen</Text>
            <Text>{substitute(invoice.paymentTerms, invoice)}</Text>
          </View>
        ) : null}

        {invoice.footer ? <Text style={{ marginTop: 14 }}>{substitute(invoice.footer, invoice)}</Text> : null}

        {invoice.teamMember ? (
          <View style={s.sig} wrap={false}>
            <Text>Mit freundlichen Grüßen</Text>
            <Text style={s.sigName}>
              {invoice.teamMember.firstName} {invoice.teamMember.lastName}
            </Text>
            {invoice.teamMember.position ? <Text>{invoice.teamMember.position}</Text> : null}
            {invoice.teamMember.email ? <Text>{invoice.teamMember.email}</Text> : null}
            {invoice.teamMember.mobile ? <Text>{invoice.teamMember.mobile}</Text> : null}
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <View style={s.footerCol}>
            <Text style={s.footerHeading}>{settings?.companyName ?? ''}</Text>
            {settings?.companyAddress ? <Text>{settings.companyAddress}</Text> : null}
            {settings?.companyZip || settings?.companyCity ? (
              <Text>{[settings?.companyZip, settings?.companyCity].filter(Boolean).join(' ')}</Text>
            ) : null}
            {settings?.companyCountry ? <Text>{settings.companyCountry}</Text> : null}
            {settings?.companyPhone ? <Text>Tel.: {settings.companyPhone}</Text> : null}
            {settings?.companyEmail ? <Text>{settings.companyEmail}</Text> : null}
            {settings?.companyWebsite ? <Text>{settings.companyWebsite}</Text> : null}
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

        <Text style={s.pageNum} fixed
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Seite ${pageNumber} / ${totalPages}` : ''
          } />
      </Page>
    </Document>
  )
}
