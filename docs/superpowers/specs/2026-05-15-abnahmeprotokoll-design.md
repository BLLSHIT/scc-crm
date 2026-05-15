# Abnahmeprotokoll Design

**Goal:** Ein mobil-optimiertes, digitales Abnahmeprotokoll pro Projekt mit frei definierbaren Phasen, Prüfpunkten inkl. Foto-Dokumentation, Tablet-Unterschrift und Remote-Freigabe per Link.

**Architecture:** Neue eigenständige Entität `acceptance_protocol` (1 pro Projekt), verknüpft über `acceptance_phases` (N, frei benennbar) → `acceptance_items` (N) → `acceptance_item_photos` (N). Keine bestehenden Tabellen werden verändert. Fotos im bestehenden `project-attachments` Storage-Bucket. PDF-Generierung via `@react-pdf/renderer` (gleiche Infrastruktur wie Angebots-/Rechnungs-PDFs).

**Tech Stack:** Next.js 15 App Router, Supabase Postgres + Storage, `@react-pdf/renderer`, HTML5 Canvas (Unterschrift), bestehende UI-Komponenten (shadcn/ui)

---

## Datenmodell

### `acceptance_protocols`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | TEXT PK | |
| `projectId` | TEXT → projects | 1:1 |
| `createdAt` | TIMESTAMPTZ | |
| `updatedAt` | TIMESTAMPTZ | |

### `acceptance_phases`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | TEXT PK | |
| `protocolId` | TEXT → acceptance_protocols | CASCADE DELETE |
| `name` | TEXT | z.B. "Vorabnahme", "Endabnahme" |
| `sortOrder` | INT | Reihenfolge, frei verschiebbar |
| `completedAt` | TIMESTAMPTZ | NULL = noch offen |
| `completedById` | TEXT → team_members | Wer hat abgeschlossen |
| `signatureDataUrl` | TEXT | Base64-PNG der Tablet-Unterschrift, nullable |
| `remoteApprovalToken` | TEXT UNIQUE | UUID für öffentlichen Freigabe-Link, nullable |
| `remoteApprovedAt` | TIMESTAMPTZ | nullable |
| `remoteApprovedByName` | TEXT | Name des Kunden bei Remote-Freigabe, nullable |
| `createdAt` | TIMESTAMPTZ | |
| `updatedAt` | TIMESTAMPTZ | |

**Regel:** Eine Phase kann nur abgeschlossen werden, wenn alle vorherigen Phasen (nach `sortOrder`) abgeschlossen sind.

### `acceptance_items`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | TEXT PK | |
| `phaseId` | TEXT → acceptance_phases | CASCADE DELETE |
| `title` | TEXT | Pflicht |
| `status` | TEXT | `not_checked` \| `ok` \| `defect` (default: `not_checked`) |
| `priority` | TEXT | `low` \| `medium` \| `critical` — nur relevant bei `status = defect`, nullable |
| `notes` | TEXT | Freitext, nullable |
| `assigneeId` | TEXT → team_members | nullable |
| `buildTeamId` | TEXT → build_teams | nullable |
| `sortOrder` | INT | |
| `createdAt` | TIMESTAMPTZ | |
| `updatedAt` | TIMESTAMPTZ | |

### `acceptance_item_photos`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | TEXT PK | |
| `itemId` | TEXT → acceptance_items | CASCADE DELETE |
| `storagePath` | TEXT | Pfad im `project-attachments` Bucket |
| `filename` | TEXT | Original-Dateiname |
| `createdAt` | TIMESTAMPTZ | |

Storage-Kategorie: `acceptance` (nutzt bestehenden `project-attachments` Bucket).

---

## Routen & Seiten

| Route | Beschreibung |
|---|---|
| `/projects/[id]/protocol` | Desktop-Übersicht + Tablet-Modus (Toggle) |
| `/approve/[token]` | Öffentliche Remote-Freigabe-Seite (kein Login) |
| `/api/projects/[id]/acceptance-pdf` | PDF-Download (GET, auth required) |

---

## UI-Struktur

### `/projects/[id]/protocol`

**Desktop-Ansicht (default):**
- Header: Projektname, "PDF herunterladen"-Button, "📱 Tablet-Modus"-Button
- Phasen-Liste: Jede Phase als Karte mit Status-Badge, Fortschritt (x/y Punkte), Datum, Unterschrifts-Indikator
- Mängel-Zusammenfassung: Alle offenen Defekte über alle Phasen
- Button "Phase hinzufügen" (öffnet Modal: Name eingeben)

**Tablet-Modus (Vollbild, Touch-optimiert):**
- Blauer Top-Bar: Aktive Phasen-Name + Projektname
- Phasen-Tabs: Scrollbar horizontal, aktive Phase weiß hervorgehoben, abgeschlossene mit ✅, gesperrte mit 🔒
- Items-Liste: Touch-freundliche Karten mit farbigem Left-Border (grün=OK, orange=Mangel, grau=offen)
- Pro Item: Tap öffnet Detail-Sheet (Status setzen, Priorität, Notiz, Fotos hochladen, Teammitglied/Bautrupp zuweisen)
- Bottom-Bar: "+ Punkt hinzufügen" + "Phase abschliessen ✓"

**Phase abschliessen — Modal:**
1. Bestätigung: "X von Y Punkten geprüft, Z offene Mängel — trotzdem abschliessen?"
2. Unterschriften-Canvas: Kunde und/oder SCC-Mitarbeiter unterschreiben
3. Speichern → `completedAt`, `completedById`, `signatureDataUrl` gesetzt

**Freigabe-Link:**
- Button "Freigabe-Link generieren" pro Phase (nur wenn Phase abgeschlossen)
- Generiert `remoteApprovalToken`, zeigt Link zum Kopieren + "Per E-Mail senden"-Link (`mailto:`)

### `/approve/[token]` (öffentlich)

- Kein Login erforderlich
- Zeigt: Projektname, Phasen-Name, alle Items mit Status + Fotos (als Thumbnails mit signierten URLs)
- Formular: Name eingeben + "Hiermit bestätige ich die Abnahme" Checkbox + "Jetzt freigeben"-Button
- Nach Freigabe: Bestätigungs-Seite "Abnahme bestätigt"

---

## PDF (`AcceptancePDFDocument`)

Struktur analog zu `QuotePDFDocument`:
- Deckblatt: Logo, Firmeninfo, Projektname, Datum
- Pro Phase: Überschrift, Abschluss-Datum, Unterschrift-Bild (oder "Remote freigegeben von [Name] am [Datum]")
- Pro Item: Status-Icon, Titel, Priorität (bei Mängeln), Notiz, Fotos als Thumbnails (max. 2 pro Zeile)
- Footer: Seitenzahl, Firmenname

---

## Server Actions

| Action | Beschreibung |
|---|---|
| `createProtocol(projectId)` | Erstellt Protokoll + optionale Standard-Phasen |
| `addPhase(protocolId, name)` | Neue Phase anlegen |
| `deletePhase(phaseId)` | Phase löschen (nur wenn leer und nicht abgeschlossen) |
| `reorderPhases(protocolId, orderedIds[])` | Phasen-Reihenfolge speichern |
| `addItem(phaseId, data)` | Prüfpunkt hinzufügen |
| `updateItem(itemId, data)` | Status, Priorität, Notiz, Zuweisung setzen |
| `deleteItem(itemId)` | Prüfpunkt löschen |
| `uploadItemPhoto(itemId, file)` | Foto hochladen → Storage + DB |
| `deleteItemPhoto(photoId)` | Foto löschen |
| `completePhase(phaseId, signatureDataUrl?)` | Phase abschliessen, Unterschrift speichern |
| `generateRemoteApprovalLink(phaseId)` | Token generieren, Link zurückgeben |
| `approveRemotely(token, name)` | Öffentliche Freigabe speichern |

---

## DB Migration

Neue SQL-Datei `prisma/migrations/manual-abnahmeprotokoll.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.acceptance_protocols (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_acceptance_protocols_project
  ON public.acceptance_protocols("projectId");

CREATE TABLE IF NOT EXISTS public.acceptance_phases (
  id TEXT PRIMARY KEY,
  "protocolId" TEXT NOT NULL REFERENCES public.acceptance_protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMPTZ,
  "completedById" TEXT REFERENCES public.team_members(id) ON DELETE SET NULL,
  "signatureDataUrl" TEXT,
  "remoteApprovalToken" TEXT UNIQUE,
  "remoteApprovedAt" TIMESTAMPTZ,
  "remoteApprovedByName" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_acceptance_phases_protocol
  ON public.acceptance_phases("protocolId", "sortOrder");

CREATE TABLE IF NOT EXISTS public.acceptance_items (
  id TEXT PRIMARY KEY,
  "phaseId" TEXT NOT NULL REFERENCES public.acceptance_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_checked'
    CHECK (status IN ('not_checked', 'ok', 'defect')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'critical')),
  notes TEXT,
  "assigneeId" TEXT REFERENCES public.team_members(id) ON DELETE SET NULL,
  "buildTeamId" TEXT REFERENCES public.build_teams(id) ON DELETE SET NULL,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_acceptance_items_phase
  ON public.acceptance_items("phaseId", "sortOrder");

CREATE TABLE IF NOT EXISTS public.acceptance_item_photos (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL REFERENCES public.acceptance_items(id) ON DELETE CASCADE,
  "storagePath" TEXT NOT NULL,
  filename TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_acceptance_item_photos_item
  ON public.acceptance_item_photos("itemId");

-- RLS
ALTER TABLE public.acceptance_protocols   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceptance_phases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceptance_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceptance_item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth all acceptance_protocols"   ON public.acceptance_protocols   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth all acceptance_phases"      ON public.acceptance_phases      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth all acceptance_items"       ON public.acceptance_items       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth all acceptance_item_photos" ON public.acceptance_item_photos FOR ALL USING (auth.role() = 'authenticated');

-- Public read for remote approval (via token lookup)
CREATE POLICY "Public read acceptance_phases by token"
  ON public.acceptance_phases FOR SELECT
  USING ("remoteApprovalToken" IS NOT NULL);

NOTIFY pgrst, 'reload schema';
```

---

## Nicht im Scope

- Drag-and-drop Sortierung der Items (sortOrder wird über Up/Down-Buttons gesetzt)
- E-Mail-Versand direkt aus der App (nur `mailto:`-Link)
- Mehrsprachigkeit
- Versionierung / Protokoll-Historie
