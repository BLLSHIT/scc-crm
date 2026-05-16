# Projekte & Abnahme — Redesign & Erweiterungen

## Überblick

Vier unabhängige Verbesserungsbereiche für das SCC-CRM: Projektliste, Kalenderansicht, Reklamationsmodul und Abnahmeprotokoll.

---

## Bereich 1 — Projektliste

### Ziel
Die Tabelle erhält neue Spalten und eine bessere Nutzbarkeit durch Kürzel-Avatare, Meilenstein-Tags und einen Toggle für abgeschlossene Projekte.

### Neue Spalten

| Spalte | Datenquelle | Darstellung |
|--------|-------------|-------------|
| **Bautrupp** | `projects.buildTeamId → build_teams.name` | Text, bereits in DB verknüpft |
| **PL** (Projektleiter) | `team_members.abbreviation` (neu) | Kreisförmiger Avatar-Badge in Grün (#036147), Hover zeigt vollen Namen |
| **Meilensteine** | `project_milestones` | Gestapelte farbige Tags pro Meilenstein |

**Spaltenreihenfolge:** Projekt · Kunde · Status · Bautrupp · PL · Meilensteine · Auftragswert  
(Start- und Enddatum aus der Tabellenansicht entfernt — sind im Kalender sichtbar)

### Meilenstein-Tags

- **Abgeschlossen** (grün): `✓ Name · Datum`
- **Offen** (gelb): `⚑ Name · Datum`
- **Aufbau** (blau, neu): `🔨 Aufbau · Startdatum – Enddatum` — einziger Typ mit Datumsbereich
- **Noch nicht fällig** (grau): `○ Name · Datum`

DB-Migration für Meilensteine:
- Spalte `type TEXT DEFAULT 'regular'` — Werte: `'regular'` | `'aufbau'`
- Spalte `endDate DATE` (nullable) — nur für Typ `aufbau` befüllt
- Bestehende Spalte heißt `dueDate` (nicht `date`) — Gantt verwendet `dueDate` als Startpunkt des Aufbau-Balkens

### Kürzel-Feld (Stammdaten)

- DB-Migration: Spalte `abbreviation VARCHAR(10)` in `team_members` (optional, nullable)
- UI: Feld „Kürzel" im Bearbeiten-Formular eines Teammitglieds
- Tabelle: Avatar-Badge `bg-[#036147] text-white` mit 2-stelligem Kürzel; falls kein Kürzel gesetzt, Initialen auto-generieren (`firstName[0] + lastName[0]`)

### Toggle: Abgeschlossene Projekte

- **Standard: ausgeblendet** — Projekte mit `status = 'completed'` werden nicht geladen
- URL-Parameter `?showCompleted=1` aktiviert die Anzeige (Server-seitig)
- Toggle-Button in der Toolbar: kleines Switch-Element mit Label „Abgeschlossene"
- Hinweiszeile unterhalb der Toolbar: „N abgeschlossene Projekte ausgeblendet — Einblenden" (Link setzt `showCompleted=1`)
- Eingeblendete abgeschlossene Projekte erscheinen gedimmt (`opacity-50`) am Ende der Liste
- Gilt nur für die Listenansicht; Board und Kalender nicht betroffen

---

## Bereich 2 — Kalenderansicht (Gantt)

### Ziel
Die Ansicht „Auslastung" wird zu „Kalender" umbenannt und durch einen funktionalen Gantt-Chart ersetzt.

### Darstellung

- **Tab-Label:** „Auslastung" → „Kalender"
- **Typ:** Gantt-Timeline, eine Zeile pro Projekt
- **Spalte links:** Projektname + Bautrupp-Name (farbig)
- **Balkenfarbe:** nach Bautrupp (jeder Trupp bekommt eine konsistente Farbe — Trupp A = #036147, Trupp B = #d97706, weitere dynamisch)
- **Projektbalken:** von `startDate` bis `plannedEndDate`
- **Aufbau-Balken:** dunkler, schmalerer Balken unterhalb des Hauptbalkens, von `milestone.dueDate` bis `milestone.endDate` (nur Typ `aufbau`)
- **Meilenstein-Marker:** `▼` in Farbe nach Status (gelb = offen, grün = erledigt, rot = Abnahme) an der entsprechenden Datum-Position
- **Heute-Linie:** vertikale blaue Linie (`#3b82f6`)
- **Hover:** Tooltip mit Projektname/Meilenstein-Name + Datum
- **Zeitfenster:** 6 Monate rollend; Navigation mit ‹ / › und „Heute"-Button
- **Abgeschlossene Projekte:** gleicher Toggle wie Listenansicht, gleicher URL-Parameter

### Technische Umsetzung

- Eigenständige Komponente `ProjectGanttCalendar` (ersetzt `CapacityCalendar`)
- Kein externes Gantt-Package — reines CSS-Grid/Position (wie im Mockup)
- Breite pro Monat = `100% / 6`; Balken-Position über `left`/`right` in Prozent berechnet
- Monate-Header scrollt mit (sticky wenn möglich)
- Query lädt Projekte inkl. `milestones` (mit `endDate`)

---

## Bereich 3 — Reklamationen an AFP

### Ziel
Eigenes Modul im Projektdetail (unterhalb der Materialliste) für Reklamationen beschädigter oder falscher Lieferungen an AFP Courts.

### Platzierung
Neue Komponente `ReclamationCard` direkt unterhalb von `MaterialChecklistCard` in `app/(app)/projects/[id]/page.tsx`.

### Datenmodell (neue Tabelle)

```sql
CREATE TABLE project_reclamations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projectId UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  courtRef TEXT,           -- z.B. "Court 2", frei
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open'  -- 'open' | 'in_progress' | 'resolved'
    CHECK (status IN ('open','in_progress','resolved')),
  reportedAt DATE NOT NULL DEFAULT CURRENT_DATE,
  resolvedAt DATE,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);
```

### UI

- **Header:** „⚠️ Reklamationen an AFP" · Badge mit Anzahl offener Einträge · Button „+ Reklamation"
- **Listenzeile:** Status-Badge (rot/gelb/grün) · Titel · Court-Bezug · Datum · Beschreibung (eingeklappt) · Chevron zum Öffnen
- **Abgeschlossene** erscheinen gedimmt mit Durchstreichung
- **Noch nicht:** AFP-Referenznummer, Fotos, Eskalations-Workflow — spätere Ausbaustufe

---

## Bereich 4 — Abnahmeprotokoll

### 4a — Desktop-Drawer: Inline-Editing

Prüfpunkte in `AcceptanceDesktopOverview` werden klickbar. Klick klappt die Karte aus und zeigt:

1. **Status-Buttons:** Offen / OK / Mangel (bei Mangel: Priorität leicht/mittel/kritisch)
2. **Anlage/Position** (neues Feld, Freitext): `z.B. Netzpfosten Nord, Ecke links`
3. **Notiz** (Textarea)
4. **Fotos** (Kamera + Bibliothek, gleiche Logik wie AcceptanceItemSheet)
5. **Speichern-Button** → ruft bestehende `updateItem`-Action auf

Implementierung: State `expandedItemId: string | null` in `AcceptanceDesktopOverview`. Expanded-Zustand rendert die Edit-Felder inline in der Phase-Karte. Kein separates Modal/Sheet.

### 4b — Anlage/Position-Feld

- DB-Migration: Spalte `position TEXT` (nullable) in `acceptance_items`
- Wird in `updateItem`-Action als optionales Feld übergeben
- Im Tablet-Modus (`AcceptanceItemSheet`): neues Textfeld zwischen Status und Notiz
- Im Desktop-Drawer: neues Textfeld im expandierten Zustand
- In der Kartenvorschau (eingeklappt): falls gesetzt, grau-klein rechts neben dem Titel angezeigt

### 4c — Tablet-Modus Design

`AcceptancePhasesTabs` erhält das Farbschema des Übergabeprotokolls:

| Element | Vorher | Nachher |
|---------|--------|---------|
| Header-Hintergrund | `bg-blue-900` | `bg-[#036147]` |
| Tab (aktiv) | `bg-white text-blue-900` | `bg-white text-[#036147]` |
| Tab (inaktiv) | `text-blue-300` | `text-emerald-200` |
| Tab (gesperrt) | `text-blue-800 opacity-50` | `text-emerald-900 opacity-40` |
| Fortschrittstext | `text-blue-300` | `text-emerald-200` |
| Item-Karte: Status OK | `border-l-green-400` | unverändert |
| „Phase abschliessen"-Button | `bg-emerald-600` | `bg-white text-[#036147] border border-[#036147]` |
| Abgeschlossen-Banner | `bg-emerald-50 text-emerald-700` | unverändert |

### 4d — Foto-Bug-Fix

**Problem:** Nach dem Upload eines Fotos in `AcceptanceItemSheet` wird `router.refresh()` aufgerufen, aber die neuen Fotos erscheinen nicht sofort — die Seite muss manuell neu geladen werden.

**Ursache:** `item.photos` ist ein Prop, das vom Server kommt. `router.refresh()` triggert einen Server-Rerender, aber React diffed die Komponente ohne das Sheet zu schließen/öffnen, sodass die neue `photoUrls`-State nicht neu initialisiert wird.

**Fix:** Nach erfolgreichem Upload das neue Foto optimistisch in einen lokalen `localPhotos`-State appenden (mit temporärer ID und der signed URL). Die Render-Logik nutzt `[...item.photos, ...localPhotos]` statt nur `item.photos`. `router.refresh()` bleibt für den Hintergrund-Sync.

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `app/(app)/projects/page.tsx` | Toggle-Logik, neue Spalten, `showCompleted`-Parameter |
| `lib/db/projects.ts` | `getProjects` erweitert: `buildTeam`, `milestones`, `teamMember.abbreviation`, completed-Filter |
| `components/projects/ProjectGanttCalendar.tsx` | **neu** — ersetzt CapacityCalendar |
| `components/projects/CapacityCalendar.tsx` | entfernen oder durch Gantt ersetzen |
| `components/projects/ReclamationCard.tsx` | **neu** |
| `lib/actions/reclamations.actions.ts` | **neu** — addReclamation, updateReclamation, deleteReclamation |
| `components/acceptance/AcceptanceDesktopOverview.tsx` | Inline-Editing, expandedItemId-State |
| `components/acceptance/AcceptanceItemSheet.tsx` | Anlage/Position-Feld, Foto-Bug-Fix |
| `components/acceptance/AcceptancePhasesTabs.tsx` | Farbschema grün |
| `lib/db/team-members.ts` | abbreviation-Feld in Queries |
| Supabase-Migrations | `team_members.abbreviation`, `acceptance_items.position`, `project_milestones.type + endDate`, `project_reclamations` (neue Tabelle) |

---

## Nicht in diesem Scope

- AFP-Referenznummer, Fotos, Eskalations-Workflow bei Reklamationen (spätere Ausbaustufe)
- Angebots-Import (Rechnung-Import bereits vorhanden)
- Abnahme: Verknüpfung mit Angebotsdokument
