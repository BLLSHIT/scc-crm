# Protokoll zusammenlegen — Design Spec

## Ziel

Der Abnahmeprotokoll-Drawer bekommt am Ende der Desktop-Übersicht einen **Übergabe-Abschnitt**: eine Zusammenfassungskarte mit Meilenstein-, Mängel- und Materialzähler sowie einem PDF-Download-Link. Der bestehende "Übergabeprotokoll"-Button im Projekt-Header bleibt erhalten.

---

## Was sich ändert

### Neue Komponente: `HandoverSummarySection`

**Datei:** `components/projects/HandoverSummarySection.tsx`

Reine UI-Komponente (kein Server Action, kein DB-Aufruf). Rendert eine Karte mit:

| Bereich | Anzeige | Farbe |
|---------|---------|-------|
| Meilensteine | `X / Y erledigt` | grün wenn X === Y, sonst slate |
| Mängel (Punch Items) | `X offen` | rot wenn X > 0, grün wenn X === 0 |
| Material | `X Positionen` | slate (immer) |
| PDF-Link | `↓ Übergabeprotokoll herunterladen` | Link auf `/api/projects/[id]/handover-pdf` |

**Props:**
```typescript
interface Props {
  projectId: string
  milestones: { completedAt?: string | null }[]
  punchItems: { isDone: boolean }[]
  materialItems: { id: string }[]
}
```

---

## Datenfluss

```
app/(app)/projects/[id]/page.tsx
  └─ AcceptanceProtocolTrigger  +milestones, +punchItems, +materialItems
       └─ AcceptanceProtocolDrawer  (Props durchreichen)
            └─ ProtocolModeWrapper  (Props durchreichen)
                 └─ AcceptanceDesktopOverview  (Props empfangen)
                      └─ <HandoverSummarySection />  (ganz unten, nach "Phase hinzufügen")
```

Die Projektseite hat die Daten bereits aus `getProjectById` — kein neuer DB-Aufruf nötig.

---

## Geänderte Dateien

| Datei | Aktion | Änderung |
|-------|--------|---------|
| `components/projects/HandoverSummarySection.tsx` | **Neu** | Zusammenfassungskarte + Download-Link |
| `components/acceptance/AcceptanceDesktopOverview.tsx` | Modify | Neue Props + `<HandoverSummarySection>` am Ende |
| `components/acceptance/ProtocolModeWrapper.tsx` | Modify | Neue Props durchreichen |
| `components/acceptance/AcceptanceProtocolDrawer.tsx` | Modify | Neue Props durchreichen |
| `components/acceptance/AcceptanceProtocolTrigger.tsx` | Modify | Neue Props empfangen + weitergeben |
| `app/(app)/projects/[id]/page.tsx` | Modify | `milestones`, `punchItems`, `materialItems` an `AcceptanceProtocolTrigger` übergeben |

---

## Was unverändert bleibt

- `HandoverProtocolTrigger` + `HandoverProtocolDrawer` im Projekt-Header — bleibt als eigenständiger Einstiegspunkt
- `AcceptancePhasesTabs` (Tablet-Modus) — kein Übergabe-Abschnitt dort
- Alle Acceptance-Actions, DB-Schicht, PDF-Routen — keine Änderungen
- Share-Seite (`/share/projects/[token]`) — unverändert

---

## Offene Punkte

Keine. Die Daten sind bereits vorhanden, kein SQL-Migration nötig.
