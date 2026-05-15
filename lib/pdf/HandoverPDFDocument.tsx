/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const GREEN = '#036147'
const SLATE = '#1e293b'
const LIGHT = '#f1f5f9'
const MUTED = '#64748b'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: SLATE, padding: 40 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, borderBottom: `2 solid ${GREEN}`, paddingBottom: 12 },
  headerLeft: { flex: 1 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GREEN },
  brandSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: SLATE },
  docDate: { fontSize: 8, color: MUTED, marginTop: 2 },
  // Info grid
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  infoBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  infoLabel: { fontSize: 7, color: MUTED, textTransform: 'uppercase', marginBottom: 3 },
  infoValue: { fontSize: 9, color: SLATE },
  infoBold: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: SLATE },
  // Sections
  section: { marginBottom: 16 },
  sectionHeader: { backgroundColor: GREEN, color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9, padding: '5 10', borderRadius: 3, marginBottom: 6 },
  // Checklist items
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4, borderBottom: `0.5 solid #e2e8f0` },
  checkBox: { width: 12, height: 12, border: `1 solid #94a3b8`, borderRadius: 2, marginRight: 8, marginTop: 0.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkBoxDone: { width: 12, height: 12, backgroundColor: GREEN, borderRadius: 2, marginRight: 8, marginTop: 0.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkMark: { color: 'white', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  checkTitle: { flex: 1, fontSize: 9 },
  checkTitleDone: { flex: 1, fontSize: 9, color: MUTED },
  // Material table
  matTable: { marginTop: 4 },
  matHeader: { flexDirection: 'row', backgroundColor: LIGHT, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 2, marginBottom: 2 },
  matHeaderCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase' },
  matRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6, borderBottom: `0.5 solid #e2e8f0` },
  matCell: { fontSize: 9 },
  // Signatures
  sigRow: { flexDirection: 'row', gap: 40, marginTop: 12 },
  sigBox: { flex: 1 },
  sigLine: { borderBottom: `1 solid ${SLATE}`, marginBottom: 4, height: 36 },
  sigLabel: { fontSize: 8, color: MUTED },
  // Footer
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5 solid #e2e8f0`, paddingTop: 6 },
  footerText: { fontSize: 7, color: MUTED },
})

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE')
}

const STATUS_LABEL: Record<string, string> = {
  planning: 'Planung', ordered: 'Material bestellt', installation: 'In Installation',
  completed: 'Abgeschlossen', on_hold: 'Pausiert', cancelled: 'Storniert',
}

interface Props {
  project: any
  generatedAt?: string
}

export function HandoverPDFDocument({ project, generatedAt }: Props) {
  const milestones: any[] = project.milestones ?? []
  const punchItems: any[] = project.punchItems ?? []
  const materialItems: any[] = project.materialItems ?? []
  const doneMs = milestones.filter((m) => m.completedAt).length
  const donePunch = punchItems.filter((p) => p.isDone).length

  return (
    <Document title={`Übergabe — ${project.name}`} author="SCC Courts GmbH">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>SCC Courts</Text>
            <Text style={styles.brandSub}>Padel Court Specialists</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Übergabeprotokoll</Text>
            <Text style={styles.docDate}>Erstellt: {generatedAt ?? formatDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Projekt</Text>
            <Text style={styles.infoBold}>{project.name}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Kunde</Text>
            <Text style={styles.infoBold}>{project.company?.name ?? '—'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{STATUS_LABEL[project.status] ?? project.status}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Installations-Ort</Text>
            <Text style={styles.infoValue}>
              {[project.locationStreet, [project.locationZip, project.locationCity].filter(Boolean).join(' ')].filter(Boolean).join('\n') || '—'}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Start</Text>
            <Text style={styles.infoValue}>{formatDate(project.startDate)}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Geplantes Ende</Text>
            <Text style={styles.infoValue}>{formatDate(project.plannedEndDate)}</Text>
          </View>
        </View>

        {/* Meilensteine */}
        {milestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              Meilensteine ({doneMs}/{milestones.length} abgeschlossen)
            </Text>
            {milestones.map((m: any) => (
              <View key={m.id} style={styles.checkRow}>
                <View style={m.completedAt ? styles.checkBoxDone : styles.checkBox}>
                  {m.completedAt && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={m.completedAt ? styles.checkTitleDone : styles.checkTitle}>{m.title}</Text>
                {m.dueDate && (
                  <Text style={{ fontSize: 8, color: MUTED, marginLeft: 8 }}>{formatDate(m.dueDate)}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Abnahme-Checkliste */}
        {punchItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              Abnahme-Checkliste ({donePunch}/{punchItems.length} erledigt)
            </Text>
            {punchItems.map((p: any) => (
              <View key={p.id} style={styles.checkRow}>
                <View style={p.isDone ? styles.checkBoxDone : styles.checkBox}>
                  {p.isDone && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={p.isDone ? styles.checkTitleDone : styles.checkTitle}>{p.title}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Material */}
        {materialItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Material</Text>
            <View style={styles.matTable}>
              <View style={styles.matHeader}>
                <Text style={[styles.matHeaderCell, { flex: 3 }]}>Bezeichnung</Text>
                <Text style={[styles.matHeaderCell, { flex: 1, textAlign: 'right' }]}>Menge</Text>
                <Text style={[styles.matHeaderCell, { flex: 1, textAlign: 'center' }]}>Bestellt</Text>
                <Text style={[styles.matHeaderCell, { flex: 1, textAlign: 'center' }]}>Eingetr.</Text>
              </View>
              {materialItems.map((m: any) => (
                <View key={m.id} style={styles.matRow}>
                  <Text style={[styles.matCell, { flex: 3 }]}>{m.title}</Text>
                  <Text style={[styles.matCell, { flex: 1, textAlign: 'right', color: MUTED }]}>
                    {m.quantity != null ? `${m.quantity}${m.unit ? ` ${m.unit}` : ''}` : '—'}
                  </Text>
                  <Text style={[styles.matCell, { flex: 1, textAlign: 'center', color: m.isOrdered ? GREEN : MUTED }]}>
                    {m.isOrdered ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.matCell, { flex: 1, textAlign: 'center', color: m.isArrived ? GREEN : MUTED }]}>
                    {m.isArrived ? '✓' : '○'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Unterschriften */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionHeader}>Übergabe bestätigt</Text>
          <View style={styles.sigRow}>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Auftraggeber (Datum, Unterschrift)</Text>
            </View>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>SCC Courts GmbH (Datum, Unterschrift)</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>SCC Courts GmbH · Übergabeprotokoll</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
