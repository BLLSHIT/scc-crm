# Protokoll zusammenlegen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen Übergabe-Zusammenfassungsblock (Meilensteine/Mängel/Material-Zähler + PDF-Link) ganz unten in der Desktop-Übersicht des Abnahmeprotokoll-Drawers einbinden.

**Architecture:** Neue Komponente `HandoverSummarySection` rendert die Karte. Die nötigen Zählerdaten fließen als optionale Props von `page.tsx` durch `AcceptanceProtocolTrigger` → `AcceptanceProtocolDrawer` → `ProtocolModeWrapper` → `AcceptanceDesktopOverview`. Kein neuer DB-Aufruf — die Daten liegen bereits im `project`-Objekt auf der Seite.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase JS (kein Änderungsbedarf)

---

## File Structure

| Datei | Aktion | Verantwortung |
|-------|--------|---------------|
| `components/projects/HandoverSummarySection.tsx` | **Neu** | Zusammenfassungskarte mit Zählern + Download-Link |
| `components/acceptance/AcceptanceDesktopOverview.tsx` | Modify | Neue Props + `<HandoverSummarySection>` am Ende des `return` |
| `components/acceptance/ProtocolModeWrapper.tsx` | Modify | Neue Props empfangen + an `AcceptanceDesktopOverview` weitergeben |
| `components/acceptance/AcceptanceProtocolDrawer.tsx` | Modify | Neue Props empfangen + an `ProtocolModeWrapper` weitergeben |
| `components/acceptance/AcceptanceProtocolTrigger.tsx` | Modify | Neue Props empfangen + an `AcceptanceProtocolDrawer` weitergeben |
| `app/(app)/projects/[id]/page.tsx` | Modify | `milestones`, `punchItems`, `materialItems` an `AcceptanceProtocolTrigger` übergeben |

---

## Task 1: HandoverSummarySection erstellen

**Files:**
- Create: `components/projects/HandoverSummarySection.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// components/projects/HandoverSummarySection.tsx
import { Download } from 'lucide-react'

interface Props {
  projectId: string
  milestones: { completedAt?: string | null }[]
  punchItems: { isDone: boolean }[]
  materialItems: { id: string }[]
}

export function HandoverSummarySection({ projectId, milestones, punchItems, materialItems }: Props) {
  const milestoneDone = milestones.filter((m) => m.completedAt).length
  const milestoneTotal = milestones.length
  const openPunch = punchItems.filter((p) => !p.isDone).length
  const materialCount = materialItems.length

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Übergabeprotokoll</h3>
        <a
          href={`/api/projects/${projectId}/handover-pdf`}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors text-slate-700"
        >
          <Download className="w-3.5 h-3.5" />
          PDF herunterladen
        </a>
      </div>
      <div className="px-4 py-3 flex gap-6">
        <div className="text-center">
          <div className={`text-xl font-bold ${milestoneDone === milestoneTotal && milestoneTotal > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
            {milestoneDone}/{milestoneTotal}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Meilensteine</div>
        </div>
        <div className="w-px bg-slate-200 self-stretch" />
        <div className="text-center">
          <div className={`text-xl font-bold ${openPunch === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {openPunch}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Mängel offen</div>
        </div>
        <div className="w-px bg-slate-200 self-stretch" />
        <div className="text-center">
          <div className="text-xl font-bold text-slate-900">{materialCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Materialpos.</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 3: Commit**

```bash
cd /Users/jhj/scc-crm
git add components/projects/HandoverSummarySection.tsx
git commit -m "feat: add HandoverSummarySection component"
```

---

## Task 2: AcceptanceDesktopOverview erweitern

**Files:**
- Modify: `components/acceptance/AcceptanceDesktopOverview.tsx`

Die Komponente hat aktuell diese `Props`-Interface (Zeile 12–15):
```typescript
interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  onTabletMode: (phaseId?: string) => void
}
```

Und die Funktion beginnt in Zeile 338:
```typescript
export function AcceptanceDesktopOverview({ protocol, projectId, onTabletMode }: Props) {
```

- [ ] **Step 1: Import hinzufügen**

Füge nach den bestehenden Imports (nach Zeile 10, also nach `import type { AcceptanceProtocol, ... }`) ein:

```typescript
import { HandoverSummarySection } from '@/components/projects/HandoverSummarySection'
```

- [ ] **Step 2: Props-Interface erweitern**

Ersetze das bestehende `interface Props` (Zeilen 12–15):

```typescript
interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  onTabletMode: (phaseId?: string) => void
  milestones?: { completedAt?: string | null }[]
  punchItems?: { isDone: boolean }[]
  materialItems?: { id: string }[]
}
```

- [ ] **Step 3: Destrukturierung erweitern**

Ersetze die Funktionssignatur in Zeile 338:

```typescript
export function AcceptanceDesktopOverview({ protocol, projectId, onTabletMode, milestones, punchItems, materialItems }: Props) {
```

- [ ] **Step 4: HandoverSummarySection am Ende des return einbinden**

Füge **nach** `{error && <p className="text-xs text-red-600">{error}</p>}` (das letzte Element im `return`) und **vor** dem schließenden `</div>` ein:

```tsx
      {milestones && punchItems && materialItems && (
        <HandoverSummarySection
          projectId={projectId}
          milestones={milestones}
          punchItems={punchItems}
          materialItems={materialItems}
        />
      )}
```

Das vollständige Ende des `return` sieht danach so aus:

```tsx
      {showForm ? (
        <div className="flex gap-2">
          <Input
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            placeholder="Phasenname z.B. Court 1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
            className="text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleAddPhase}>Hinzufügen</Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewPhaseName('') }}>Abbrechen</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full border-dashed">
          <Plus className="w-4 h-4 mr-2" /> Phase hinzufügen
        </Button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {milestones && punchItems && materialItems && (
        <HandoverSummarySection
          projectId={projectId}
          milestones={milestones}
          punchItems={punchItems}
          materialItems={materialItems}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 6: Commit**

```bash
cd /Users/jhj/scc-crm
git add components/acceptance/AcceptanceDesktopOverview.tsx
git commit -m "feat: add HandoverSummarySection to AcceptanceDesktopOverview"
```

---

## Task 3: Props durch ProtocolModeWrapper durchreichen

**Files:**
- Modify: `components/acceptance/ProtocolModeWrapper.tsx`

Aktuelle `Props`-Interface (Zeilen 11–16):
```typescript
interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
}
```

- [ ] **Step 1: Props-Interface erweitern**

Ersetze die bestehende `interface Props`:

```typescript
interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
  milestones?: { completedAt?: string | null }[]
  punchItems?: { isDone: boolean }[]
  materialItems?: { id: string }[]
}
```

- [ ] **Step 2: Destrukturierung und Weitergabe erweitern**

Ersetze die Funktionssignatur und den `AcceptanceDesktopOverview`-Aufruf:

```typescript
export function ProtocolModeWrapper({ protocol, projectId, teamMembers, buildTeams, currentUserId, milestones, punchItems, materialItems }: Props) {
```

Ersetze den `return`-Block (der `AcceptanceDesktopOverview`-Aufruf am Ende):

```tsx
  return (
    <AcceptanceDesktopOverview
      protocol={protocol}
      projectId={projectId}
      onTabletMode={(phaseId?: string) => { setInitialPhaseId(phaseId); setTabletMode(true) }}
      milestones={milestones}
      punchItems={punchItems}
      materialItems={materialItems}
    />
  )
```

- [ ] **Step 3: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 4: Commit**

```bash
cd /Users/jhj/scc-crm
git add components/acceptance/ProtocolModeWrapper.tsx
git commit -m "feat: thread handover summary props through ProtocolModeWrapper"
```

---

## Task 4: Props durch AcceptanceProtocolDrawer durchreichen

**Files:**
- Modify: `components/acceptance/AcceptanceProtocolDrawer.tsx`

Aktuelle `Props`-Interface (Zeilen 10–18):
```typescript
interface Props {
  open: boolean
  onClose: () => void
  protocol: AcceptanceProtocol
  projectId: string
  projectName: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
}
```

- [ ] **Step 1: Props-Interface erweitern**

Ersetze die bestehende `interface Props`:

```typescript
interface Props {
  open: boolean
  onClose: () => void
  protocol: AcceptanceProtocol
  projectId: string
  projectName: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
  milestones?: { completedAt?: string | null }[]
  punchItems?: { isDone: boolean }[]
  materialItems?: { id: string }[]
}
```

- [ ] **Step 2: Destrukturierung und Weitergabe erweitern**

Ersetze die Funktionssignatur:

```typescript
export function AcceptanceProtocolDrawer({
  open, onClose, protocol, projectId, projectName, teamMembers, buildTeams, currentUserId,
  milestones, punchItems, materialItems,
}: Props) {
```

Ersetze den `<ProtocolModeWrapper>`-Aufruf (Zeilen 72–78):

```tsx
          <ProtocolModeWrapper
            protocol={protocol}
            projectId={projectId}
            teamMembers={teamMembers}
            buildTeams={buildTeams}
            currentUserId={currentUserId}
            milestones={milestones}
            punchItems={punchItems}
            materialItems={materialItems}
          />
```

- [ ] **Step 3: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 4: Commit**

```bash
cd /Users/jhj/scc-crm
git add components/acceptance/AcceptanceProtocolDrawer.tsx
git commit -m "feat: thread handover summary props through AcceptanceProtocolDrawer"
```

---

## Task 5: Props durch AcceptanceProtocolTrigger durchreichen

**Files:**
- Modify: `components/acceptance/AcceptanceProtocolTrigger.tsx`

Aktuelle `Props`-Interface (Zeilen 7–15):
```typescript
interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  projectName: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
}
```

- [ ] **Step 1: Props-Interface erweitern**

Ersetze die bestehende `interface Props`:

```typescript
interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  projectName: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
  milestones?: { completedAt?: string | null }[]
  punchItems?: { isDone: boolean }[]
  materialItems?: { id: string }[]
}
```

- [ ] **Step 2: Destrukturierung und Weitergabe erweitern**

Ersetze die Funktionssignatur:

```typescript
export function AcceptanceProtocolTrigger({
  protocol, projectId, projectName, teamMembers, buildTeams, currentUserId,
  milestones, punchItems, materialItems,
}: Props) {
```

Ersetze den `<AcceptanceProtocolDrawer>`-Aufruf:

```tsx
      <AcceptanceProtocolDrawer
        open={open}
        onClose={() => setOpen(false)}
        protocol={protocol}
        projectId={projectId}
        projectName={projectName}
        teamMembers={teamMembers}
        buildTeams={buildTeams}
        currentUserId={currentUserId}
        milestones={milestones}
        punchItems={punchItems}
        materialItems={materialItems}
      />
```

- [ ] **Step 3: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 4: Commit**

```bash
cd /Users/jhj/scc-crm
git add components/acceptance/AcceptanceProtocolTrigger.tsx
git commit -m "feat: thread handover summary props through AcceptanceProtocolTrigger"
```

---

## Task 6: Daten von page.tsx übergeben

**Files:**
- Modify: `app/(app)/projects/[id]/page.tsx:141-150`

Der bestehende `<AcceptanceProtocolTrigger>`-Aufruf (Zeilen 141–150) sieht so aus:

```tsx
              {protocol && (
                <AcceptanceProtocolTrigger
                  protocol={protocol}
                  projectId={id}
                  projectName={project.name}
                  teamMembers={tmRes.data ?? []}
                  buildTeams={buildTeams}
                  currentUserId={currentUserId ?? undefined}
                />
              )}
```

`project.milestones` hat den Typ `{ id: string; title: string; startDate?: string | null; dueDate?: string | null; completedAt?: string | null; sortOrder: number }[]` — enthält `completedAt`.

`project.punchItems` hat den Typ `{ id: string; title: string; isDone: boolean; sortOrder: number }[]` — enthält `isDone`.

`project.materialItems` hat den Typ `{ id: string; title: string; ... }[]` — enthält `id`.

- [ ] **Step 1: AcceptanceProtocolTrigger-Aufruf erweitern**

Ersetze den bestehenden `<AcceptanceProtocolTrigger>`-Block:

```tsx
              {protocol && (
                <AcceptanceProtocolTrigger
                  protocol={protocol}
                  projectId={id}
                  projectName={project.name}
                  teamMembers={tmRes.data ?? []}
                  buildTeams={buildTeams}
                  currentUserId={currentUserId ?? undefined}
                  milestones={project.milestones ?? []}
                  punchItems={project.punchItems ?? []}
                  materialItems={project.materialItems ?? []}
                />
              )}
```

- [ ] **Step 2: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 3: Manuell im Browser testen**

1. Projekt öffnen → "Abnahmeprotokoll"-Button klicken
2. Ganz unten im Drawer erscheint ein Block "Übergabeprotokoll" mit drei Zählern: Meilensteine X/Y, Mängel offen N, Materialpos. M
3. "PDF herunterladen"-Button im Block löst Download von `/api/projects/[id]/handover-pdf` aus
4. Übergabeprotokoll-Button im Header funktioniert weiterhin unverändert

- [ ] **Step 4: Commit**

```bash
cd /Users/jhj/scc-crm
git add app/\(app\)/projects/\[id\]/page.tsx
git commit -m "feat: pass project data to AcceptanceProtocolTrigger for handover summary"
```

---

## Self-Review

**Spec-Abdeckung:**
- ✅ `HandoverSummarySection` neue Komponente (Task 1)
- ✅ Meilenstein-Zähler `completedAt` (Task 1)
- ✅ Mängel-Zähler `isDone` (Task 1)
- ✅ Material-Zähler (Task 1)
- ✅ PDF-Download-Link `/api/projects/[id]/handover-pdf` (Task 1)
- ✅ Einbindung am Ende von `AcceptanceDesktopOverview` (Task 2)
- ✅ Props-Kette durch alle 4 Zwischenkomponenten (Tasks 3–5)
- ✅ Daten von `page.tsx` übergeben, kein neuer DB-Aufruf (Task 6)
- ✅ Übergabeprotokoll-Button im Header bleibt unverändert (kein Task nötig)
- ✅ Tablet-Modus bleibt unverändert (kein Task nötig)

**Typ-Konsistenz:** Alle Props verwenden dieselben anonymen Inline-Typen (`{ completedAt?: string | null }[]`, `{ isDone: boolean }[]`, `{ id: string }[]`) konsistent durch Tasks 1–5. In Task 6 kommen breitere Typen aus `project` — TypeScript akzeptiert das (strukturelles Typing, mehr Felder sind ok).
