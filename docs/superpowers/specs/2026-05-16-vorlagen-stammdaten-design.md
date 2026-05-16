# Vorlagen für Meilensteine & Checklisten — Design Spec

## Ziel

Verwaltbare Vorlagen für Meilensteine, Punch List und Materialliste, die unter Stammdaten gepflegt und in Projekte importiert werden können. Vorlagen können als einzelne Listen oder als Sets (alle drei Typen gebündelt) angelegt werden.

## Architektur

Vorlagen werden in der Datenbank gespeichert und über eine Stammdaten-Oberfläche verwaltet. Der Import in ein Projekt erfolgt über ein Modal auf der Projektdetailseite. Die bestehenden hardcodierten Vorlagen (`insertDefaultMilestones`, `insertDefaultPunchItems`) werden durch DB-Vorlagen ersetzt.

---

## Datenbankschema

Sechs neue Tabellen. Alle mit RLS `auth.role() = 'authenticated'`.

```sql
-- Einzelne Vorlagen (je Typ eine Tabelle)
CREATE TABLE milestone_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE milestone_template_items (
  id TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL REFERENCES milestone_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE punchlist_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE punchlist_template_items (
  id TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL REFERENCES punchlist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE material_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE material_template_items (
  id TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL REFERENCES material_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  notes TEXT,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sets: verknüpfen bis zu eine Vorlage pro Typ
CREATE TABLE template_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "milestoneTemplateId" TEXT REFERENCES milestone_templates(id) ON DELETE SET NULL,
  "punchlistTemplateId" TEXT REFERENCES punchlist_templates(id) ON DELETE SET NULL,
  "materialTemplateId"  TEXT REFERENCES material_templates(id)  ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Indizes auf alle `templateId`-Spalten für schnelle Abfragen.

---

## Navigation

Der bestehende "Stammdaten"-Bereich in der Sidebar erhält vier neue Einträge:

```
Stammdaten
  ├── Produkte              (bestehend)
  ├── Branchen              (bestehend)
  ├── Lead-Quellen          (bestehend)
  ├── Textbausteine         (bestehend)
  ├── Bautrupp              (bestehend)
  ├── Meilenstein-Vorlagen  (NEU → /stammdaten/meilenstein-vorlagen)
  ├── Checklisten-Vorlagen  (NEU → /stammdaten/checklisten-vorlagen)
  ├── Material-Vorlagen     (NEU → /stammdaten/material-vorlagen)
  └── Vorlagen-Sets         (NEU → /stammdaten/vorlagen-sets)
```

---

## Stammdaten-Seiten

### Muster (gilt für alle drei Vorlagentypen)

Jeder Typ folgt demselben zwei-Ebenen-Muster:

**Übersichtsseite** (`/stammdaten/meilenstein-vorlagen`):
- Kacheln/Karten aller Vorlagen (Name, Anzahl Einträge, Beschreibung)
- "+ Neue Vorlage" Button → öffnet Inline-Formular oder navigiert zu Neuanlage
- Vorlage löschen (mit Confirm-Dialog; warnt wenn Vorlage in einem Set verwendet wird)

**Detailseite** (`/stammdaten/meilenstein-vorlagen/[id]`):
- Name und Beschreibung inline editierbar
- Liste der Einträge: inline editierbar (Klick auf Titel → editierbar)
- Neue Einträge per "+ Eintrag hinzufügen" am Ende
- Einträge löschen per Trash-Icon
- Sortierung per Drag & Drop (dnd-kit, bereits im Projekt vorhanden)
- Felder pro Typ:
  - **Meilenstein**: Titel, Beschreibung (optional)
  - **Punch List**: Titel
  - **Material**: Titel, Menge, Einheit, Notizen

### Vorlagen-Sets-Seite (`/stammdaten/vorlagen-sets`)

- Liste aller Sets mit Name und welche Vorlagen verknüpft sind
- "+ Neues Set" → Formular: Name, Beschreibung, drei Dropdowns (je eine Vorlage pro Typ, alle optional)
- Inline-Edit der Verknüpfungen
- Löschen mit Bestätigung

---

## Import in Projekt

### Einstiegspunkt

Auf der Projektdetailseite: in jeder der drei Karten (MilestonesCard, PunchListCard, MaterialChecklistCard) wird der bestehende "Vorlage laden"-Button durch einen einheitlichen **"Vorlage importieren"**-Button ersetzt. Alle drei Buttons öffnen dasselbe zentrale Modal.

### Import-Modal

```
┌─────────────────────────────────────────┐
│ Vorlage importieren                      │
│                                         │
│ ● Set importieren                       │
│   [Standard Padel Court           ▾]    │
│                                         │
│ ○ Einzelne Vorlagen                     │
│   Meilensteine: [— keine —        ▾]    │
│   Punch List:   [— keine —        ▾]    │
│   Material:     [— keine —        ▾]    │
│                                         │
│ Bestehende Einträge                     │
│ ○ Ersetzen   ○ Ergänzen                 │
│                                         │
│           [Abbrechen] [Importieren]     │
└─────────────────────────────────────────┘
```

**Verhalten:**
- Wahl "Set": füllt die drei Dropdowns automatisch vor; Dropdowns bleiben editierbar
- Wahl "Einzelne Vorlagen": Dropdowns unabhängig; leere Dropdowns = dieser Typ wird nicht importiert
- "Ersetzen": löscht alle bestehenden Einträge des gewählten Typs vor dem Einfügen
- "Ergänzen": fügt Vorlageeinträge zu bestehenden Einträgen hinzu (sortOrder wird ans Ende angehängt)
- "Importieren" disabled wenn kein Set und keine einzelne Vorlage gewählt

### Server Action

```typescript
importTemplate(projectId, {
  milestoneTemplateId?: string,
  punchlistTemplateId?: string,
  materialTemplateId?: string,
  mode: 'replace' | 'append'
})
```

Läuft in einer Transaktion (Supabase RPC oder sequenzielle Deletes + Inserts). Bei "replace" werden nur die Typen gelöscht, für die eine Vorlage gewählt wurde.

---

## Dateistruktur

```
app/(app)/stammdaten/
  meilenstein-vorlagen/
    page.tsx                  ← Übersicht
    [id]/page.tsx             ← Detailseite
  checklisten-vorlagen/
    page.tsx
    [id]/page.tsx
  material-vorlagen/
    page.tsx
    [id]/page.tsx
  vorlagen-sets/
    page.tsx

components/templates/
  TemplateListPage.tsx        ← Wiederverwendbare Übersichtsseite
  TemplateDetailPage.tsx      ← Wiederverwendbare Detailseite
  ImportTemplateModal.tsx     ← Das Import-Modal

lib/db/templates.ts           ← DB-Abfragen für alle Vorlagentypen
lib/actions/templates.actions.ts  ← CRUD + importTemplate Action
lib/validations/template.schema.ts

prisma/migrations/manual-vorlagen.sql
```

---

## Edge Cases

- **Vorlage löschen die in einem Set verwendet wird**: Warnung anzeigen, Set-Verknüpfung wird auf NULL gesetzt (CASCADE SET NULL in DB)
- **Set importieren mit fehlender Verknüpfung**: Fehlende Typen werden still übersprungen
- **Leere Vorlage importieren**: Erlaubt (löscht bei "Ersetzen" die bestehenden Einträge, fügt nichts ein)
- **Hardcodierte Standardvorlagen** (`insertDefaultMilestones`, `insertDefaultPunchItems`): werden entfernt; stattdessen beim ersten App-Start oder per Seed eine DB-Vorlage anlegen

---

## Was nicht gebaut wird

- Drag & Drop Sortierung im Import-Modal (nicht nötig)
- Vorschau der Vorlage-Einträge im Modal (Vorlage ist im Stammdaten-Bereich einsehbar)
- Versionierung von Vorlagen
- Rechte-Management pro Vorlage
