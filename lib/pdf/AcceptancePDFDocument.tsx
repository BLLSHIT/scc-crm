// lib/pdf/AcceptancePDFDocument.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { BRAND } from '@/lib/brand'
import type { AcceptanceProtocol } from '@/lib/db/acceptance-protocol'

const PRIORITY_LABEL: Record<string, string> = { low: 'Leicht', medium: 'Mittel', critical: 'Kritisch' }

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE')
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#0f172a', paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24 32 16 32', borderBottom: '1 solid #e2e8f0' },
  logo: { width: 80, height: 30, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
  headerSub: { fontSize: 8, color: '#64748b', marginTop: 2 },
  body: { padding: '20 32' },
  phaseHeader: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e40af', marginTop: 16, marginBottom: 4, borderBottom: '1 solid #bfdbfe', paddingBottom: 3 },
  phaseMeta: { fontSize: 8, color: '#64748b', marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, padding: '5 8', borderRadius: 4 },
  itemOk: { backgroundColor: '#f0fdf4' },
  itemDefect: { backgroundColor: '#fff7ed' },
  itemOpen: { backgroundColor: '#f8fafc' },
  statusBadge: { fontSize: 7, fontFamily: 'Helvetica-Bold', padding: '2 5', borderRadius: 10, marginRight: 8, minWidth: 40, textAlign: 'center' },
  badgeOk: { backgroundColor: '#dcfce7', color: '#15803d' },
  badgeDefect: { backgroundColor: '#fed7aa', color: '#c2410c' },
  badgeOpen: { backgroundColor: '#f1f5f9', color: '#64748b' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  itemNotes: { fontSize: 8, color: '#64748b', marginTop: 2 },
  itemMeta: { fontSize: 7, color: '#94a3b8', marginTop: 2 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  photo: { width: 70, height: 70, borderRadius: 4, objectFit: 'cover' },
  signatureSection: { marginTop: 8, padding: '6 8', backgroundColor: '#f0fdf4', borderRadius: 4 },
  signatureLabel: { fontSize: 7, color: '#15803d', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  signatureImg: { height: 40, maxWidth: 200, objectFit: 'contain' },
  remoteApproval: { fontSize: 8, color: '#15803d', marginTop: 4 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1 solid #e2e8f0', paddingTop: 6 },
  footerText: { fontSize: 7, color: '#94a3b8' },
  pageNumber: { fontSize: 7, color: '#94a3b8' },
})

interface Props {
  protocol: AcceptanceProtocol & { projectName: string }
  settings: any
  photoUrls: Record<string, string>
  generatedAt: string
}

export function AcceptancePDFDocument({ protocol, settings, photoUrls, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          {settings?.logoUrl ? (
            <Image src={settings.logoUrl} style={styles.logo} />
          ) : (
            <Text style={{ ...styles.headerTitle, color: BRAND.colors.green }}>{settings?.companyName ?? 'SCC Courts'}</Text>
          )}
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Abnahmeprotokoll</Text>
            <Text style={styles.headerSub}>{protocol.projectName}</Text>
            <Text style={styles.headerSub}>Erstellt: {generatedAt}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {protocol.phases.map((phase) => (
            <View key={phase.id} wrap={false}>
              <Text style={styles.phaseHeader}>{phase.name}</Text>
              <Text style={styles.phaseMeta}>
                {phase.completedAt
                  ? `Abgeschlossen: ${formatDate(phase.completedAt)}${phase.completedBy ? ` · ${phase.completedBy.firstName} ${phase.completedBy.lastName}` : ''}`
                  : 'In Bearbeitung'}
                {phase.remoteApprovedAt
                  ? ` · Fernfreigabe: ${phase.remoteApprovedByName} am ${formatDate(phase.remoteApprovedAt)}`
                  : ''}
              </Text>

              {phase.items.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    item.status === 'ok'     ? styles.itemOk     :
                    item.status === 'defect' ? styles.itemDefect  :
                                               styles.itemOpen,
                  ]}
                >
                  <Text style={[
                    styles.statusBadge,
                    item.status === 'ok'     ? styles.badgeOk     :
                    item.status === 'defect' ? styles.badgeDefect  :
                                               styles.badgeOpen,
                  ]}>
                    {item.status === 'ok' ? 'OK' : item.status === 'defect' ? 'Mangel' : 'Offen'}
                  </Text>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.status === 'defect' && item.priority && (
                      <Text style={styles.itemNotes}>Priorität: {PRIORITY_LABEL[item.priority]}</Text>
                    )}
                    {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
                    {(item.assignee || item.buildTeam) && (
                      <Text style={styles.itemMeta}>
                        {item.assignee ? `${item.assignee.firstName} ${item.assignee.lastName}` : item.buildTeam?.name}
                      </Text>
                    )}
                    {item.photos.length > 0 && (
                      <View style={styles.photoRow}>
                        {item.photos.slice(0, 4).map((photo) => photoUrls[photo.id] ? (
                          <Image key={photo.id} src={photoUrls[photo.id]} style={styles.photo} />
                        ) : null)}
                      </View>
                    )}
                  </View>
                </View>
              ))}

              {/* Signature */}
              {phase.signatureDataUrl && (
                <View style={styles.signatureSection}>
                  <Text style={styles.signatureLabel}>Unterschrift</Text>
                  <Image src={phase.signatureDataUrl} style={styles.signatureImg} />
                </View>
              )}
              {phase.remoteApprovedAt && !phase.signatureDataUrl && (
                <View style={styles.signatureSection}>
                  <Text style={styles.remoteApproval}>
                    ✓ Digital freigegeben von {phase.remoteApprovedByName} am {formatDate(phase.remoteApprovedAt)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {settings?.companyName ?? 'SCC Courts'}{settings?.companyRegisterNumber ? ` · HRB ${settings.companyRegisterNumber}` : ''}
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
