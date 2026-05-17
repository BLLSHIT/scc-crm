# Meilensteine Gantt-Integration — Design Spec

## Ziel

Die bestehende `MilestonesCard` auf der Projektdetailseite wird um eine interaktive Gantt-Ansicht erweitert. Meilensteine erhalten ein optionales Startdatum, sodass sie als ziehbare Balken dargestellt werden können. Die Listenansicht bleibt erhalten und ist per Toggle-Button wechselbar.

---

## Datenmodell

### Migration `project_milestones`

```sql
-- Neues Feld
ALTER TABLE project_milestones ADD COLUMN "startDate" DATE;

-- Aufbau-Meilensteine migrieren: dueDate war Start, endDate war Ende
UPDATE project_milestones
SET "startDate" = "dueDate",
    "dueDate" = "endDate"
WHERE type = 'aufbau' AND "endDate" IS NOT NULL;

-- Veraltete Felder entfernen
ALTER TABLE project_milestones DROP COLUMN "endDate";
ALTER TABLE project_milestones DROP COLUMN type;
```

### Neue Semantik

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `startDate` | `DATE` optional | Start des Balkens; wenn NULL → Diamant im Gantt |
| `dueDate` | `TIMESTAMP` | Enddatum / Deadline (Pflichtfeld bleibt) |

---

## UI-Komponenten

### MilestonesCard (erweitert)

**Header:**
- Toggle-Gruppe `☰ Liste | ▬ Gantt` (Zustand in `useState`, kein DB-Persist nötig)
- Zweiter Toggle `KW | Mon` nur sichtbar wenn Gantt aktiv
- Bestehende Buttons `Vorlage laden` und `+ Meilenstein` bleiben

**Listenansicht (unverändert bis auf Datum):**
- Meilensteine zeigen jetzt `Von – Bis` wenn `startDate` gesetzt, sonst nur `dueDate`

**Gantt-Ansicht:**
- Zeitachse: horizontale Spalten = KW oder Monate
- Jede Zeile = ein Meilenstein
- Balken: `startDate` bis `dueDate` → blauer/gelber/grüner Balken
- Kein `startDate` → Diamant-Symbol am `dueDate`
- Erledigte Meilensteine: gedämpftes Grün, kein Drag
- Heute-Linie: vertikale rote gestrichelte Linie

### Formular (Meilenstein hinzufügen/bearbeiten)

Neue Felder:
- `Von` (Date-Input, optional) → `startDate`
- `Bis` (Date-Input, Pflicht) → `dueDate` (bisher "Fällig am")

---

## Gantt-Implementierung

**Bibliothek:** keine — eigene Implementierung mit `@dnd-kit/core`.

### Zeitachsen-Berechnung

```typescript
// Projektspanne bestimmen (frühestes startDate bis spätestes dueDate)
// + 2 Wochen Puffer links/rechts
// KW-Modus: Spalten = Kalenderwochen (ISO 8601)
// Monats-Modus: Spalten = Kalendermonate
// Adaptive Voreinstellung: < 3 Monate → KW, sonst → Monate
```

### Snap-Logik

- KW-Modus: Snap auf Wochenstarts (Montag)
- Monats-Modus: Snap auf Monatsstarts

### Drag-Verhalten

| Aktion | Ergebnis |
|--------|----------|
| Ganzen Balken ziehen | `startDate` + `dueDate` verschieben (Dauer bleibt) |
| Linke Kante ziehen | `startDate` ändern |
| Rechte Kante ziehen | `dueDate` ändern |
| Erledigter Meilenstein | kein Drag |
| Minimum-Breite | 1 Woche / 1 Monat |

**Speichern:** Optimistischer Update auf `mouseup` → Server Action `updateMilestoneDates(id, startDate, dueDate)` → bei Fehler Rollback.

---

## Neue/geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `prisma/migrations/manual-meilensteine-gantt.sql` | Migration: startDate, endDate/type entfernen |
| `lib/actions/projects.actions.ts` | `addMilestone` + `updateMilestone` um `startDate` erweitern; neue Action `updateMilestoneDates` |
| `lib/validations/project.schema.ts` | `milestoneSchema`: `startDate` optional, `dueDate` Pflicht, `endDate`/`type` entfernen |
| `components/projects/MilestonesCard.tsx` | Toggle-Logik, Gantt/Liste-Render, erweitertes Formular |
| `components/projects/MilestoneGantt.tsx` | Neue Client-Komponente: Gantt-Rendering + @dnd-kit Drag |

---

## Offene Punkte

- `@dnd-kit/core` muss als Dependency hinzugefügt werden (`npm install @dnd-kit/core @dnd-kit/utilities`)
- `milestone_templates` haben kein `startDate` — Templates importieren nur `title` + `description`, keine Daten; kein Änderungsbedarf
- Die öffentliche Share-Seite (`/share/projects/[token]`) zeigt Meilensteine read-only — dort reicht die Listenansicht, kein Gantt nötig
