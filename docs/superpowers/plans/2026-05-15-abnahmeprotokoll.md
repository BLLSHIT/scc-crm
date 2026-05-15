# Abnahmeprotokoll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Digitales Abnahmeprotokoll pro Projekt mit frei definierbaren Phasen, Prüfpunkten, Foto-Dokumentation, Tablet-Unterschrift und Remote-Freigabe per Link.

**Architecture:** Neue eigenständige Entität `acceptance_protocols` (1 pro Projekt) → `acceptance_phases` (frei benennbar, sortierbar) → `acceptance_items` → `acceptance_item_photos`. Fotos im bestehenden `project-attachments` Storage-Bucket. PDF via `@react-pdf/renderer`. Remote-Freigabe über öffentliche Route `/approve/[token]` mit Service-Role-Client.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres + Storage, `@react-pdf/renderer`, HTML5 Canvas (Unterschrift), shadcn/ui

---

## File Map

**Create:**
- `prisma/migrations/manual-abnahmeprotokoll.sql`
- `lib/db/acceptance-protocol.ts`
- `lib/actions/acceptance-protocol.actions.ts`
- `lib/pdf/AcceptancePDFDocument.tsx`
- `components/acceptance/AcceptanceDesktopOverview.tsx`
- `components/acceptance/AcceptanceItemCard.tsx`
- `components/acceptance/AcceptanceItemSheet.tsx`
- `components/acceptance/SignatureModal.tsx`
- `components/acceptance/AcceptancePhasesTabs.tsx`
- `app/(app)/projects/[id]/protocol/page.tsx`
- `app/approve/[token]/page.tsx`
- `app/api/projects/[id]/acceptance-pdf/route.ts`

**Modify:**
- `app/(app)/projects/[id]/page.tsx` — "Protokoll" Button hinzufügen
- `.gitignore` — `.superpowers/` hinzufügen

---

## Task 1: DB Migration

**Files:**
- Create: `prisma/migrations/manual-abnahmeprotokoll.sql`
- Modify: `.gitignore`

- [ ] **Step 1: SQL-Datei schreiben**

```sql
-- prisma/migrations/manual-abnahmeprotokoll.sql
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_acceptance_phases_token
  ON public.acceptance_phases("remoteApprovalToken")
  WHERE "remoteApprovalToken" IS NOT NULL;

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

-- RLS: authenticated users can read/write everything
ALTER TABLE public.acceptance_protocols   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceptance_phases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceptance_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceptance_item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth all acceptance_protocols"   ON public.acceptance_protocols   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth all acceptance_phases"      ON public.acceptance_phases      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth all acceptance_items"       ON public.acceptance_items       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth all acceptance_item_photos" ON public.acceptance_item_photos FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: In Supabase ausführen**

Öffne Supabase Dashboard → SQL Editor → neues Query → obiges SQL einfügen → Run.
Erwartung: alle 4 Tabellen angelegt, keine Fehler.

- [ ] **Step 3: .gitignore aktualisieren**

Öffne `.gitignore` und füge am Ende hinzu:
```
# Visual brainstorm sessions
.superpowers/
```

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/manual-abnahmeprotokoll.sql .gitignore
git commit -m "feat: acceptance protocol DB migration + .gitignore"
```

---

## Task 2: DB Layer

**Files:**
- Create: `lib/db/acceptance-protocol.ts`

- [ ] **Step 1: Datei anlegen**

```typescript
// lib/db/acceptance-protocol.ts
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AcceptanceItemPhoto {
  id: string
  itemId: string
  storagePath: string
  filename: string
  createdAt: string
}

export interface AcceptanceItem {
  id: string
  phaseId: string
  title: string
  status: 'not_checked' | 'ok' | 'defect'
  priority: 'low' | 'medium' | 'critical' | null
  notes: string | null
  assigneeId: string | null
  buildTeamId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  photos: AcceptanceItemPhoto[]
  assignee: { id: string; firstName: string; lastName: string } | null
  buildTeam: { id: string; name: string } | null
}

export interface AcceptancePhase {
  id: string
  protocolId: string
  name: string
  sortOrder: number
  completedAt: string | null
  completedById: string | null
  signatureDataUrl: string | null
  remoteApprovalToken: string | null
  remoteApprovedAt: string | null
  remoteApprovedByName: string | null
  createdAt: string
  updatedAt: string
  items: AcceptanceItem[]
  completedBy: { id: string; firstName: string; lastName: string } | null
}

export interface AcceptanceProtocol {
  id: string
  projectId: string
  createdAt: string
  updatedAt: string
  phases: AcceptancePhase[]
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getOrCreateProtocol(projectId: string): Promise<AcceptanceProtocol> {
  const supabase = await createClient()

  // Check existing
  const { data: existing } = await supabase
    .from('acceptance_protocols')
    .select('*')
    .eq('projectId', projectId)
    .single()

  let protocolId: string
  if (existing) {
    protocolId = existing.id
  } else {
    const id = randomUUID()
    const { error } = await supabase
      .from('acceptance_protocols')
      .insert({ id, projectId, updatedAt: new Date().toISOString() })
    if (error) throw new Error(error.message)
    protocolId = id
  }

  return getProtocolWithDetails(protocolId)
}

export async function getProtocolWithDetails(protocolId: string): Promise<AcceptanceProtocol> {
  const supabase = await createClient()

  const { data: protocol, error: pErr } = await supabase
    .from('acceptance_protocols')
    .select('*')
    .eq('id', protocolId)
    .single()
  if (pErr || !protocol) throw new Error(pErr?.message ?? 'Protokoll nicht gefunden')

  const { data: phases, error: phErr } = await supabase
    .from('acceptance_phases')
    .select(`*, completedBy:team_members!completedById(id, firstName, lastName)`)
    .eq('protocolId', protocolId)
    .order('sortOrder', { ascending: true })
  if (phErr) throw new Error(phErr.message)

  const phaseList: AcceptancePhase[] = await Promise.all(
    (phases ?? []).map(async (phase) => {
      const { data: items } = await supabase
        .from('acceptance_items')
        .select(`
          *,
          assignee:team_members!assigneeId(id, firstName, lastName),
          buildTeam:build_teams!buildTeamId(id, name)
        `)
        .eq('phaseId', phase.id)
        .order('sortOrder', { ascending: true })

      const itemList: AcceptanceItem[] = await Promise.all(
        (items ?? []).map(async (item) => {
          const { data: photos } = await supabase
            .from('acceptance_item_photos')
            .select('*')
            .eq('itemId', item.id)
            .order('createdAt', { ascending: true })
          return {
            ...item,
            photos: (photos ?? []) as AcceptanceItemPhoto[],
          } as AcceptanceItem
        })
      )

      return {
        ...phase,
        items: itemList,
        completedBy: phase.completedBy ?? null,
      } as AcceptancePhase
    })
  )

  return { ...protocol, phases: phaseList } as AcceptanceProtocol
}

export async function getPhaseByRemoteToken(token: string): Promise<{
  phase: AcceptancePhase
  projectName: string
  protocolId: string
} | null> {
  const supabase = await createClient()

  const { data: phase } = await supabase
    .from('acceptance_phases')
    .select('*')
    .eq('remoteApprovalToken', token)
    .single()
  if (!phase) return null

  const { data: protocol } = await supabase
    .from('acceptance_protocols')
    .select('*, project:projects(name)')
    .eq('id', phase.protocolId)
    .single()
  if (!protocol) return null

  const { data: items } = await supabase
    .from('acceptance_items')
    .select('*, assignee:team_members!assigneeId(id, firstName, lastName), buildTeam:build_teams!buildTeamId(id, name)')
    .eq('phaseId', phase.id)
    .order('sortOrder', { ascending: true })

  const itemList: AcceptanceItem[] = await Promise.all(
    (items ?? []).map(async (item) => {
      const { data: photos } = await supabase
        .from('acceptance_item_photos')
        .select('*')
        .eq('itemId', item.id)
      return { ...item, photos: photos ?? [] } as AcceptanceItem
    })
  )

  return {
    phase: { ...phase, items: itemList, completedBy: null } as AcceptancePhase,
    projectName: (protocol.project as any)?.name ?? '',
    protocolId: protocol.id,
  }
}
```

- [ ] **Step 2: Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1 | head -20
```

Erwartung: Keine Fehler in der neuen Datei.

- [ ] **Step 3: Commit**

```bash
git add lib/db/acceptance-protocol.ts
git commit -m "feat: acceptance protocol DB layer and types"
```

---

## Task 3: Server Actions

**Files:**
- Create: `lib/actions/acceptance-protocol.actions.ts`

- [ ] **Step 1: Datei anlegen**

```typescript
// lib/actions/acceptance-protocol.actions.ts
'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProtocolWithDetails } from '@/lib/db/acceptance-protocol'

export type ActionResult = { error?: string }

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/protocol`)
  revalidatePath(`/projects/${projectId}`)
}

// ── Phase CRUD ───────────────────────────────────────────────────────────────

export async function addPhase(
  protocolId: string,
  projectId: string,
  name: string
): Promise<ActionResult> {
  if (!name.trim()) return { error: 'Name ist Pflicht.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { data: existing } = await supabase
    .from('acceptance_phases')
    .select('id')
    .eq('protocolId', protocolId)
    .order('sortOrder', { ascending: false })
    .limit(1)
  const nextOrder = existing?.[0] ? (existing[0] as any).sortOrder + 1 : 0

  const { error } = await supabase.from('acceptance_phases').insert({
    id: randomUUID(),
    protocolId,
    name: name.trim(),
    sortOrder: nextOrder,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function deletePhase(phaseId: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { data: phase } = await supabase
    .from('acceptance_phases')
    .select('completedAt')
    .eq('id', phaseId)
    .single()
  if (phase?.completedAt) return { error: 'Abgeschlossene Phasen können nicht gelöscht werden.' }

  const { error } = await supabase.from('acceptance_phases').delete().eq('id', phaseId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function reorderPhases(
  protocolId: string,
  projectId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('acceptance_phases').update({ sortOrder: idx, updatedAt: new Date().toISOString() }).eq('id', id)
    )
  )
  revalidate(projectId)
  return {}
}

// ── Item CRUD ────────────────────────────────────────────────────────────────

export async function addItem(
  phaseId: string,
  projectId: string,
  title: string
): Promise<ActionResult> {
  if (!title.trim()) return { error: 'Titel ist Pflicht.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { data: existing } = await supabase
    .from('acceptance_items')
    .select('sortOrder')
    .eq('phaseId', phaseId)
    .order('sortOrder', { ascending: false })
    .limit(1)
  const nextOrder = existing?.[0] ? (existing[0] as any).sortOrder + 1 : 0

  const { error } = await supabase.from('acceptance_items').insert({
    id: randomUUID(),
    phaseId,
    title: title.trim(),
    status: 'not_checked',
    sortOrder: nextOrder,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function updateItem(
  itemId: string,
  projectId: string,
  data: {
    title?: string
    status?: 'not_checked' | 'ok' | 'defect'
    priority?: 'low' | 'medium' | 'critical' | null
    notes?: string | null
    assigneeId?: string | null
    buildTeamId?: string | null
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const update: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() }
  // Clear priority when status is not defect
  if (data.status && data.status !== 'defect') update.priority = null

  const { error } = await supabase.from('acceptance_items').update(update).eq('id', itemId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function deleteItem(itemId: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('acceptance_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

// ── Photo metadata ───────────────────────────────────────────────────────────

export async function recordItemPhoto(
  itemId: string,
  projectId: string,
  storagePath: string,
  filename: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('acceptance_item_photos').insert({
    id: randomUUID(),
    itemId,
    storagePath,
    filename,
  })
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function deleteItemPhoto(
  photoId: string,
  storagePath: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  await supabase.storage.from('project-attachments').remove([storagePath])
  const { error } = await supabase.from('acceptance_item_photos').delete().eq('id', photoId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

// ── Phase abschliessen ───────────────────────────────────────────────────────

export async function completePhase(
  phaseId: string,
  projectId: string,
  signatureDataUrl: string | null,
  completedById: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('acceptance_phases').update({
    completedAt: new Date().toISOString(),
    completedById: completedById ?? null,
    signatureDataUrl: signatureDataUrl ?? null,
    updatedAt: new Date().toISOString(),
  }).eq('id', phaseId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

export async function reopenPhase(phaseId: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('acceptance_phases').update({
    completedAt: null,
    completedById: null,
    signatureDataUrl: null,
    remoteApprovalToken: null,
    remoteApprovedAt: null,
    remoteApprovedByName: null,
    updatedAt: new Date().toISOString(),
  }).eq('id', phaseId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return {}
}

// ── Remote Freigabe ──────────────────────────────────────────────────────────

export async function generateRemoteApprovalLink(
  phaseId: string,
  projectId: string
): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const token = randomUUID()
  const { error } = await supabase.from('acceptance_phases').update({
    remoteApprovalToken: token,
    updatedAt: new Date().toISOString(),
  }).eq('id', phaseId)
  if (error) return { error: error.message }
  revalidate(projectId)
  return { token }
}

export async function submitRemoteApproval(
  token: string,
  approverName: string
): Promise<ActionResult> {
  if (!approverName.trim()) return { error: 'Name ist Pflicht.' }
  // Use service role to bypass RLS on public page
  const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return { error: 'Server-Konfigurationsfehler.' }

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.from('acceptance_phases').update({
    remoteApprovedAt: new Date().toISOString(),
    remoteApprovedByName: approverName.trim(),
    updatedAt: new Date().toISOString(),
  }).eq('remoteApprovalToken', token)
  if (error) return { error: error.message }
  return {}
}
```

- [ ] **Step 2: Build prüfen**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Erwartung: Keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/acceptance-protocol.actions.ts
git commit -m "feat: acceptance protocol server actions"
```

---

## Task 4: Desktop Overview Component

**Files:**
- Create: `components/acceptance/AcceptanceDesktopOverview.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// components/acceptance/AcceptanceDesktopOverview.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Plus, Tablet, FileText, AlertTriangle, Trash2, RotateCcw } from 'lucide-react'
import { addPhase, deletePhase, generateRemoteApprovalLink, reopenPhase } from '@/lib/actions/acceptance-protocol.actions'
import type { AcceptanceProtocol, AcceptancePhase } from '@/lib/db/acceptance-protocol'

interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  onTabletMode: () => void
}

const PRIORITY_LABEL = { low: 'leicht', medium: 'mittel', critical: 'kritisch' }

function PhaseCard({ phase, projectId, onTabletMode }: { phase: AcceptancePhase; projectId: string; onTabletMode: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [copySuccess, setCopySuccess] = useState(false)

  const total = phase.items.length
  const ok = phase.items.filter((i) => i.status === 'ok').length
  const defects = phase.items.filter((i) => i.status === 'defect')
  const isComplete = !!phase.completedAt

  function handleDelete() {
    if (!confirm(`Phase "${phase.name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deletePhase(phase.id, projectId)
      router.refresh()
    })
  }

  function handleReopen() {
    if (!confirm(`Phase "${phase.name}" wieder öffnen? Unterschrift und Freigabe werden gelöscht.`)) return
    startTransition(async () => {
      await reopenPhase(phase.id, projectId)
      router.refresh()
    })
  }

  async function handleGenerateLink() {
    const result = await generateRemoteApprovalLink(phase.id, projectId)
    if (result.token) {
      const url = `${window.location.origin}/approve/${result.token}`
      await navigator.clipboard.writeText(url)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      router.refresh()
    }
  }

  return (
    <div className={`border rounded-xl p-4 ${isComplete ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isComplete
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              : <Circle className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            <span className="font-semibold text-sm text-slate-900">{phase.name}</span>
            {isComplete && <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">Abgeschlossen</Badge>}
          </div>
          <p className="text-xs text-slate-500 ml-6">
            {ok}/{total} Punkte geprüft
            {phase.completedAt && ` · ${new Date(phase.completedAt).toLocaleDateString('de-DE')}`}
            {phase.completedBy && ` · ${phase.completedBy.firstName} ${phase.completedBy.lastName}`}
          </p>
          {phase.remoteApprovedAt && (
            <p className="text-xs text-emerald-700 ml-6 mt-0.5">
              Fernfreigabe: {phase.remoteApprovedByName} · {new Date(phase.remoteApprovedAt).toLocaleDateString('de-DE')}
            </p>
          )}
          {defects.length > 0 && (
            <div className="ml-6 mt-2 flex flex-wrap gap-1">
              {defects.map((d) => (
                <span key={d.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                  d.priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                  d.priority === 'medium'   ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  ⚠ {d.title} {d.priority ? `(${PRIORITY_LABEL[d.priority]})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          {!isComplete && (
            <Button size="sm" variant="outline" onClick={onTabletMode} className="text-xs">
              <Tablet className="w-3 h-3 mr-1" /> Ausfüllen
            </Button>
          )}
          {isComplete && !phase.remoteApprovalToken && (
            <Button size="sm" variant="outline" onClick={handleGenerateLink} className="text-xs">
              🔗 Freigabe-Link
            </Button>
          )}
          {isComplete && phase.remoteApprovalToken && !phase.remoteApprovedAt && (
            <Button size="sm" variant="outline" onClick={async () => {
              const url = `${window.location.origin}/approve/${phase.remoteApprovalToken}`
              await navigator.clipboard.writeText(url)
              setCopySuccess(true)
              setTimeout(() => setCopySuccess(false), 2000)
            }} className="text-xs">
              {copySuccess ? '✓ Kopiert' : '📋 Link kopieren'}
            </Button>
          )}
          {isComplete && (
            <Button size="sm" variant="ghost" onClick={handleReopen} className="text-xs text-amber-600">
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
          {!isComplete && (
            <Button size="sm" variant="ghost" onClick={handleDelete} className="text-xs text-red-500">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function AcceptanceDesktopOverview({ protocol, projectId, onTabletMode }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allDefects = protocol.phases.flatMap((p) => p.items.filter((i) => i.status === 'defect'))

  function handleAddPhase() {
    if (!newPhaseName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addPhase(protocol.id, projectId, newPhaseName)
      if (result.error) { setError(result.error); return }
      setNewPhaseName('')
      setShowForm(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Abnahmeprotokoll</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onTabletMode}>
            <Tablet className="w-4 h-4 mr-2" /> Tablet-Modus
          </Button>
          <Link
            href={`/api/projects/${projectId}/acceptance-pdf`}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4" /> PDF
          </Link>
        </div>
      </div>

      {/* Mängel-Zusammenfassung */}
      {allDefects.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {allDefects.length} offene Mängel
          </p>
          <ul className="mt-2 space-y-1">
            {allDefects.map((d) => (
              <li key={d.id} className="text-xs text-orange-700 flex items-center gap-2">
                <span>• {d.title}</span>
                {d.priority && <span className="text-orange-500">({PRIORITY_LABEL[d.priority]})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phasen */}
      <div className="space-y-3">
        {protocol.phases.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Noch keine Phasen. Füge eine Phase hinzu.</p>
        )}
        {protocol.phases.map((phase) => (
          <PhaseCard key={phase.id} phase={phase} projectId={projectId} onTabletMode={onTabletMode} />
        ))}
      </div>

      {/* Phase hinzufügen */}
      {showForm ? (
        <div className="flex gap-2">
          <Input
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            placeholder="Phasenname z.B. Vorabnahme"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
            className="text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleAddPhase}>Hinzufügen</Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewPhaseName('') }}>Abbrechen</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" /> Phase hinzufügen
        </Button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Build prüfen**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Erwartung: Keine Fehler in der neuen Datei.

- [ ] **Step 3: Commit**

```bash
git add components/acceptance/AcceptanceDesktopOverview.tsx
git commit -m "feat: acceptance desktop overview component"
```

---

## Task 5: Item Card + Item Sheet

**Files:**
- Create: `components/acceptance/AcceptanceItemCard.tsx`
- Create: `components/acceptance/AcceptanceItemSheet.tsx`

- [ ] **Step 1: AcceptanceItemCard anlegen**

```typescript
// components/acceptance/AcceptanceItemCard.tsx
'use client'
import { Camera } from 'lucide-react'
import type { AcceptanceItem } from '@/lib/db/acceptance-protocol'

interface Props {
  item: AcceptanceItem
  onEdit: (item: AcceptanceItem) => void
}

const STATUS_CONFIG = {
  ok:          { label: 'OK',           border: 'border-l-green-400',  badge: 'bg-green-100 text-green-700' },
  defect:      { label: 'Mangel',       border: 'border-l-orange-400', badge: 'bg-orange-100 text-orange-700' },
  not_checked: { label: 'Nicht geprüft', border: 'border-l-slate-200',  badge: 'bg-slate-100 text-slate-500' },
}

const PRIORITY_LABEL = { low: 'leicht', medium: 'mittel', critical: 'kritisch' }

export function AcceptanceItemCard({ item, onEdit }: Props) {
  const cfg = STATUS_CONFIG[item.status]

  return (
    <button
      onClick={() => onEdit(item)}
      className={`w-full text-left bg-white rounded-xl p-4 border-l-4 shadow-sm active:scale-[0.99] transition-transform ${cfg.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{item.title}</p>
          {item.notes && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.notes}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
              {cfg.label}
            </span>
            {item.status === 'defect' && item.priority && (
              <span className="text-xs text-orange-600">({PRIORITY_LABEL[item.priority]})</span>
            )}
            {(item.assignee || item.buildTeam) && (
              <span className="text-xs text-slate-400">
                {item.assignee ? `${item.assignee.firstName} ${item.assignee.lastName}` : item.buildTeam?.name}
              </span>
            )}
            {item.photos.length > 0 && (
              <span className="text-xs text-slate-400 flex items-center gap-0.5">
                <Camera className="w-3 h-3" /> {item.photos.length}
              </span>
            )}
          </div>
        </div>
        <span className="text-slate-400 text-lg leading-none flex-shrink-0">›</span>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: AcceptanceItemSheet anlegen**

```typescript
// components/acceptance/AcceptanceItemSheet.tsx
'use client'
import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Camera, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateItem, deleteItem, recordItemPhoto, deleteItemPhoto } from '@/lib/actions/acceptance-protocol.actions'
import { createClient } from '@/lib/supabase/client'
import type { AcceptanceItem } from '@/lib/db/acceptance-protocol'

interface TeamOption { id: string; firstName: string; lastName: string }
interface BuildTeamOption { id: string; name: string }

interface Props {
  item: AcceptanceItem
  projectId: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  onClose: () => void
}

export function AcceptanceItemSheet({ item, projectId, teamMembers, buildTeams, onClose }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState(item.status)
  const [priority, setPriority] = useState<string>(item.priority ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [assigneeId, setAssigneeId] = useState(item.assigneeId ?? '')
  const [buildTeamId, setBuildTeamId] = useState(item.buildTeamId ?? '')
  const [uploading, setUploading] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  // Load signed URLs for existing photos
  useEffect(() => {
    if (item.photos.length === 0) return
    const supabase = createClient()
    item.photos.forEach(async (photo) => {
      const { data } = await supabase.storage
        .from('project-attachments')
        .createSignedUrl(photo.storagePath, 3600)
      if (data?.signedUrl) {
        setPhotoUrls((prev) => ({ ...prev, [photo.id]: data.signedUrl }))
      }
    })
  }, [item.photos])

  function handleSave() {
    startTransition(async () => {
      const result = await updateItem(item.id, projectId, {
        status: status as AcceptanceItem['status'],
        priority: (status === 'defect' && priority) ? priority as AcceptanceItem['priority'] : null,
        notes: notes || null,
        assigneeId: assigneeId || null,
        buildTeamId: buildTeamId || null,
      })
      if (result.error) { setError(result.error); return }
      router.refresh()
      onClose()
    })
  }

  function handleDelete() {
    if (!confirm(`"${item.title}" wirklich löschen?`)) return
    startTransition(async () => {
      await deleteItem(item.id, projectId)
      router.refresh()
      onClose()
    })
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `acceptance/${projectId}/${item.id}/${Date.now()}_${safe}`

      const { error: upErr } = await supabase.storage
        .from('project-attachments')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || `image/${ext}` })
      if (upErr) throw upErr

      const result = await recordItemPhoto(item.id, projectId, storagePath, file.name)
      if (result.error) throw new Error(result.error)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePhoto(photoId: string, storagePath: string) {
    if (!confirm('Foto löschen?')) return
    startTransition(async () => {
      await deleteItemPhoto(photoId, storagePath, projectId)
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ touchAction: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-900 text-base truncate flex-1">{item.title}</h2>
        <button onClick={onClose} className="ml-3 p-1.5 rounded-full hover:bg-slate-200">
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Status */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Status</p>
          <div className="flex gap-2">
            {(['not_checked', 'ok', 'defect'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  status === s
                    ? s === 'ok'    ? 'bg-green-500 text-white border-green-500'
                    : s === 'defect' ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {s === 'ok' ? 'OK' : s === 'defect' ? 'Mangel' : 'Offen'}
              </button>
            ))}
          </div>
        </div>

        {/* Priority — only when defect */}
        {status === 'defect' && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Priorität</p>
            <div className="flex gap-2">
              {(['low', 'medium', 'critical'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    priority === p
                      ? p === 'critical' ? 'bg-red-500 text-white border-red-500'
                      : p === 'medium'   ? 'bg-orange-400 text-white border-orange-400'
                      : 'bg-yellow-400 text-slate-900 border-yellow-400'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {p === 'low' ? 'Leicht' : p === 'medium' ? 'Mittel' : 'Kritisch'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Notiz</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Beschreibung des Befunds..."
          />
        </div>

        {/* Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Teammitglied</p>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Bautrupp</p>
            <select
              value={buildTeamId}
              onChange={(e) => setBuildTeamId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {buildTeams.map((bt) => (
                <option key={bt.id} value={bt.id}>{bt.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Photos */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fotos</p>
          <div className="flex flex-wrap gap-2">
            {item.photos.map((photo) => (
              <div key={photo.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                {photoUrls[photo.id] ? (
                  <img src={photoUrls[photo.id]} alt={photo.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <button
                  onClick={() => handleDeletePhoto(photo.id, photo.storagePath)}
                  className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5"
                >
                  <XCircle className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
            <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors ${uploading ? 'opacity-50' : ''}`}>
              <Camera className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-400 mt-1">{uploading ? '...' : 'Foto'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePhotoUpload(f)
                  e.currentTarget.value = ''
                }}
              />
            </label>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Footer actions */}
      <div className="border-t border-slate-200 p-4 flex gap-3 bg-white">
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500">
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button onClick={handleSave} className="flex-1">Speichern</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build prüfen**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add components/acceptance/AcceptanceItemCard.tsx components/acceptance/AcceptanceItemSheet.tsx
git commit -m "feat: acceptance item card and sheet components"
```

---

## Task 6: Signature Modal

**Files:**
- Create: `components/acceptance/SignatureModal.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// components/acceptance/SignatureModal.tsx
'use client'
import { useRef, useEffect, useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onSave: (dataUrl: string | null) => void
  onClose: () => void
}

export function SignatureModal({ onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPoint(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const pt = getPoint(e)
    if (!pt) return
    setDrawing(true)
    setIsEmpty(false)
    lastPoint.current = pt
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) { ctx.beginPath(); ctx.moveTo(pt.x, pt.y) }
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing) return
    const pt = getPoint(e)
    if (!pt) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !lastPoint.current) return
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPoint.current = pt
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setDrawing(false)
    lastPoint.current = null
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  function save() {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) { onSave(null); return }
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">Unterschrift</h2>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100">
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>
      <p className="text-xs text-slate-500 text-center py-2">Bitte hier unterschreiben</p>
      <div className="flex-1 px-4 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="w-full max-w-lg border-2 border-dashed border-slate-300 rounded-xl touch-none"
          style={{ cursor: 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="p-4 flex gap-3 border-t border-slate-200">
        <Button variant="outline" size="sm" onClick={clear}>
          <RotateCcw className="w-4 h-4 mr-1" /> Löschen
        </Button>
        <Button onClick={save} className="flex-1" disabled={isEmpty}>
          Unterschrift speichern
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onSave(null)}>
          Überspringen
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build prüfen**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/acceptance/SignatureModal.tsx
git commit -m "feat: signature modal with canvas"
```

---

## Task 7: Phase Tabs (Tablet-Modus)

**Files:**
- Create: `components/acceptance/AcceptancePhasesTabs.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// components/acceptance/AcceptancePhasesTabs.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AcceptanceItemCard } from '@/components/acceptance/AcceptanceItemCard'
import { AcceptanceItemSheet } from '@/components/acceptance/AcceptanceItemSheet'
import { SignatureModal } from '@/components/acceptance/SignatureModal'
import { addItem, addPhase, completePhase } from '@/lib/actions/acceptance-protocol.actions'
import type { AcceptanceProtocol, AcceptancePhase, AcceptanceItem } from '@/lib/db/acceptance-protocol'

interface TeamOption { id: string; firstName: string; lastName: string }
interface BuildTeamOption { id: string; name: string }

interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
}

export function AcceptancePhasesTabs({ protocol, projectId, teamMembers, buildTeams, currentUserId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [activePhaseId, setActivePhaseId] = useState<string>(protocol.phases[0]?.id ?? '')
  const [editingItem, setEditingItem] = useState<AcceptanceItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [showSignature, setShowSignature] = useState(false)
  const [showAddPhase, setShowAddPhase] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activePhase: AcceptancePhase | undefined = protocol.phases.find((p) => p.id === activePhaseId)

  // A phase is locked if any previous phase is not completed
  function isLocked(phase: AcceptancePhase): boolean {
    const idx = protocol.phases.findIndex((p) => p.id === phase.id)
    if (idx === 0) return false
    return protocol.phases.slice(0, idx).some((p) => !p.completedAt)
  }

  function handleAddItem() {
    if (!newItemTitle.trim() || !activePhaseId) return
    setError(null)
    startTransition(async () => {
      const result = await addItem(activePhaseId, projectId, newItemTitle)
      if (result.error) { setError(result.error); return }
      setNewItemTitle('')
      setShowAddItem(false)
      router.refresh()
    })
  }

  function handleAddPhase() {
    if (!newPhaseName.trim()) return
    startTransition(async () => {
      const result = await addPhase(protocol.id, projectId, newPhaseName)
      if (result.error) { setError(result.error); return }
      setNewPhaseName('')
      setShowAddPhase(false)
      router.refresh()
    })
  }

  function handleCompletePhase(signatureDataUrl: string | null) {
    setShowSignature(false)
    if (!activePhaseId) return
    startTransition(async () => {
      const result = await completePhase(activePhaseId, projectId, signatureDataUrl, currentUserId ?? null)
      if (result.error) { setError(result.error); return }
      // Move to next incomplete phase
      const nextPhase = protocol.phases.find((p) => !p.completedAt && p.id !== activePhaseId)
      if (nextPhase) setActivePhaseId(nextPhase.id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100" style={{ touchAction: 'pan-y' }}>
      {/* Top bar */}
      <div className="bg-blue-900 text-white px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-base truncate">{activePhase?.name ?? 'Protokoll'}</h1>
          <span className="text-xs text-blue-300 ml-2">{activePhase ? `${activePhase.items.filter(i => i.status !== 'not_checked').length}/${activePhase.items.length}` : ''}</span>
        </div>
        {/* Phase tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none -mx-1 px-1">
          {protocol.phases.map((phase) => {
            const locked = isLocked(phase)
            const active = phase.id === activePhaseId
            return (
              <button
                key={phase.id}
                onClick={() => !locked && setActivePhaseId(phase.id)}
                disabled={locked}
                className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  active   ? 'bg-white text-blue-900'
                  : locked ? 'text-blue-800 cursor-not-allowed opacity-50'
                  : phase.completedAt ? 'text-blue-300 hover:text-white'
                  : 'text-blue-300 hover:text-white'
                }`}
              >
                {phase.completedAt ? <CheckCircle2 className="w-3 h-3" /> : locked ? <Lock className="w-3 h-3" /> : null}
                {phase.name}
              </button>
            )
          })}
          <button
            onClick={() => setShowAddPhase(true)}
            className="flex-shrink-0 px-2 py-2 text-xs text-blue-400 hover:text-white"
          >
            +
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!activePhase && (
          <p className="text-sm text-slate-400 text-center py-12">Keine Phase ausgewählt.</p>
        )}
        {activePhase?.completedAt && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 text-center">
            ✅ Phase abgeschlossen am {new Date(activePhase.completedAt).toLocaleDateString('de-DE')}
          </div>
        )}
        {activePhase?.items.map((item) => (
          <AcceptanceItemCard
            key={item.id}
            item={item}
            onEdit={(i) => setEditingItem(i)}
          />
        ))}
        {activePhase?.items.length === 0 && !activePhase.completedAt && (
          <p className="text-sm text-slate-400 text-center py-8">Noch keine Prüfpunkte. Füge einen hinzu.</p>
        )}
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
      </div>

      {/* Bottom action bar */}
      {activePhase && !activePhase.completedAt && (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 p-3">
          {showAddItem ? (
            <div className="flex gap-2">
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Prüfpunkt Titel"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                autoFocus
                className="text-sm"
              />
              <button
                onClick={handleAddItem}
                className="bg-blue-600 text-white px-4 rounded-lg text-sm font-medium"
              >
                OK
              </button>
              <button
                onClick={() => { setShowAddItem(false); setNewItemTitle('') }}
                className="px-3 text-slate-500 text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddItem(true)}
                className="flex-1 py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 font-medium flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Punkt hinzufügen
              </button>
              <button
                onClick={() => setShowSignature(true)}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Phase abschliessen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add phase form */}
      {showAddPhase && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-slate-200 p-4 flex gap-2">
          <Input
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            placeholder="Neue Phase benennen..."
            autoFocus
            className="text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
          />
          <button onClick={handleAddPhase} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-medium">OK</button>
          <button onClick={() => setShowAddPhase(false)} className="px-3 text-slate-500 text-sm">✕</button>
        </div>
      )}

      {/* Item Sheet */}
      {editingItem && (
        <AcceptanceItemSheet
          item={editingItem}
          projectId={projectId}
          teamMembers={teamMembers}
          buildTeams={buildTeams}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Signature Modal */}
      {showSignature && (
        <SignatureModal
          onSave={handleCompletePhase}
          onClose={() => setShowSignature(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build prüfen**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add components/acceptance/AcceptancePhasesTabs.tsx
git commit -m "feat: acceptance phases tabs tablet component"
```

---

## Task 8: Protocol Page

**Files:**
- Create: `app/(app)/projects/[id]/protocol/page.tsx`
- Create: `components/acceptance/ProtocolModeWrapper.tsx`

**Note:** The page is a **Server Component** so `router.refresh()` in child components triggers a proper server-side re-fetch. Tablet-mode is a client-only overlay via `ProtocolModeWrapper`.

- [ ] **Step 1: ProtocolModeWrapper anlegen**

```typescript
// components/acceptance/ProtocolModeWrapper.tsx
'use client'
import { useState } from 'react'
import { AcceptanceDesktopOverview } from '@/components/acceptance/AcceptanceDesktopOverview'
import { AcceptancePhasesTabs } from '@/components/acceptance/AcceptancePhasesTabs'
import type { AcceptanceProtocol } from '@/lib/db/acceptance-protocol'

interface TeamOption { id: string; firstName: string; lastName: string }
interface BuildTeamOption { id: string; name: string }

interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
}

export function ProtocolModeWrapper({ protocol, projectId, teamMembers, buildTeams }: Props) {
  const [tabletMode, setTabletMode] = useState(false)

  if (tabletMode) {
    return (
      <div className="fixed inset-0 z-40 bg-slate-100">
        <div className="absolute top-3 left-3 z-50">
          <button
            onClick={() => setTabletMode(false)}
            className="bg-white text-slate-700 text-xs px-3 py-1.5 rounded-full shadow border border-slate-200"
          >
            ← Desktop
          </button>
        </div>
        <AcceptancePhasesTabs
          protocol={protocol}
          projectId={projectId}
          teamMembers={teamMembers}
          buildTeams={buildTeams}
        />
      </div>
    )
  }

  return (
    <AcceptanceDesktopOverview
      protocol={protocol}
      projectId={projectId}
      onTabletMode={() => setTabletMode(true)}
    />
  )
}
```

- [ ] **Step 2: Protocol Page (Server Component) anlegen**

```typescript
// app/(app)/projects/[id]/protocol/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProtocol } from '@/lib/db/acceptance-protocol'
import { getActiveBuildTeamOptions } from '@/lib/db/build-teams'
import { ProtocolModeWrapper } from '@/components/acceptance/ProtocolModeWrapper'

export default async function ProtocolPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [protocol, tmRes, buildTeams] = await Promise.all([
    getOrCreateProtocol(projectId),
    supabase.from('team_members').select('id, firstName, lastName').eq('isActive', true).order('lastName'),
    getActiveBuildTeamOptions(),
  ])

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> Zurück zum Projekt
        </Link>
      </div>
      <main className="p-6 max-w-3xl mx-auto">
        <ProtocolModeWrapper
          protocol={protocol}
          projectId={projectId}
          teamMembers={tmRes.data ?? []}
          buildTeams={buildTeams}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

Erwartung: Build erfolgreich, keine TS-Fehler.

- [ ] **Step 4: Commit**

```bash
git add components/acceptance/ProtocolModeWrapper.tsx app/\(app\)/projects/\[id\]/protocol/page.tsx
git commit -m "feat: acceptance protocol page (server component) + mode wrapper"
```

---

## Task 9: Remote Approval Page

**Files:**
- Create: `app/approve/[token]/page.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// app/approve/[token]/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { CheckCircle2, Circle, Camera, AlertTriangle } from 'lucide-react'
import { submitRemoteApproval } from '@/lib/actions/acceptance-protocol.actions'

const STATUS_LABEL: Record<string, string> = {
  ok: 'OK',
  defect: 'Mangel',
  not_checked: 'Nicht geprüft',
}
const PRIORITY_LABEL: Record<string, string> = { low: 'leicht', medium: 'mittel', critical: 'kritisch' }

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE')
}

async function getApprovalData(token: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return null

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: phase } = await admin
    .from('acceptance_phases')
    .select('*, protocol:acceptance_protocols(projectId, project:projects(name))')
    .eq('remoteApprovalToken', token)
    .single()
  if (!phase) return null

  const { data: items } = await admin
    .from('acceptance_items')
    .select('*, assignee:team_members!assigneeId(id, firstName, lastName)')
    .eq('phaseId', phase.id)
    .order('sortOrder', { ascending: true })

  const itemsWithPhotos = await Promise.all(
    (items ?? []).map(async (item: any) => {
      const { data: photos } = await admin
        .from('acceptance_item_photos')
        .select('*')
        .eq('itemId', item.id)

      // Generate signed URLs
      const photosWithUrls = await Promise.all(
        (photos ?? []).map(async (photo: any) => {
          const { data: signed } = await admin.storage
            .from('project-attachments')
            .createSignedUrl(photo.storagePath, 3600)
          return { ...photo, signedUrl: signed?.signedUrl ?? null }
        })
      )
      return { ...item, photos: photosWithUrls }
    })
  )

  return {
    phase,
    items: itemsWithPhotos,
    projectName: (phase.protocol as any)?.project?.name ?? '',
  }
}

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getApprovalData(token)
  if (!data) notFound()

  const { phase, items, projectName } = data
  const isAlreadyApproved = !!phase.remoteApprovedAt
  const defects = items.filter((i: any) => i.status === 'defect')

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs text-slate-400 mb-1">Abnahmeprotokoll</p>
          <h1 className="text-xl font-bold text-slate-900">{phase.name}</h1>
          <p className="text-sm text-slate-600 mt-1">{projectName}</p>
          {phase.completedAt && (
            <p className="text-xs text-slate-400 mt-2">
              Abgeschlossen am {formatDate(phase.completedAt)}
            </p>
          )}
        </div>

        {/* Already approved */}
        {isAlreadyApproved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <p className="font-semibold text-emerald-800">Abnahme bestätigt</p>
            <p className="text-sm text-emerald-700 mt-1">
              {phase.remoteApprovedByName} · {formatDate(phase.remoteApprovedAt)}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Prüfpunkte ({items.length})</h2>
          {items.map((item: any) => (
            <div key={item.id} className={`rounded-xl border p-3 ${
              item.status === 'ok'    ? 'border-emerald-200 bg-emerald-50' :
              item.status === 'defect'? 'border-orange-200 bg-orange-50'  :
                                        'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start gap-2">
                {item.status === 'ok'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  : item.status === 'defect'
                  ? <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  {item.status === 'defect' && item.priority && (
                    <p className="text-xs text-orange-600 mt-0.5">Priorität: {PRIORITY_LABEL[item.priority]}</p>
                  )}
                  {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                  {item.photos?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.photos.map((photo: any) => photo.signedUrl && (
                        <img
                          key={photo.id}
                          src={photo.signedUrl}
                          alt={photo.filename}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  item.status === 'ok'     ? 'bg-emerald-100 text-emerald-700' :
                  item.status === 'defect' ? 'bg-orange-100 text-orange-700'  :
                                             'bg-slate-100 text-slate-500'
                }`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Mängel summary */}
        {defects.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {defects.length} Mängel dokumentiert
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Diese werden nach der Abnahme behoben.
            </p>
          </div>
        )}

        {/* Approval form — only if not yet approved */}
        {!isAlreadyApproved && (
          <form
            action={async (formData: FormData) => {
              'use server'
              const name = formData.get('approverName') as string
              await submitRemoteApproval(token, name)
            }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-slate-700">Abnahme bestätigen</h2>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Ihr Name *</label>
              <input
                name="approverName"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vor- und Nachname"
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded" />
              <span className="text-sm text-slate-700">
                Hiermit bestätige ich die Abnahme der oben aufgeführten Arbeiten gemäß dem Protokoll.
              </span>
            </label>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              ✓ Abnahme jetzt bestätigen
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-400">
          Erstellt mit SCC Courts CRM · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add app/approve/
git commit -m "feat: public remote approval page"
```

---

## Task 10: PDF Document + API Route

**Files:**
- Create: `lib/pdf/AcceptancePDFDocument.tsx`
- Create: `app/api/projects/[id]/acceptance-pdf/route.ts`

- [ ] **Step 1: AcceptancePDFDocument anlegen**

```typescript
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
            <Text style={{ ...styles.headerTitle, color: BRAND.primary }}>{settings?.companyName ?? 'SCC Courts'}</Text>
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
```

- [ ] **Step 2: API Route anlegen**

```typescript
// app/api/projects/[id]/acceptance-pdf/route.ts
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProtocol } from '@/lib/db/acceptance-protocol'
import { AcceptancePDFDocument } from '@/lib/pdf/AcceptancePDFDocument'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const [protocol, projectRes, settingsRes] = await Promise.all([
      getOrCreateProtocol(projectId),
      supabase.from('projects').select('name').eq('id', projectId).single(),
      supabase.from('settings').select('*').eq('id', 'singleton').single(),
    ])

    const projectName = projectRes.data?.name ?? projectId

    // Collect all photo storagePaths
    const allPhotos = protocol.phases.flatMap((ph) => ph.items.flatMap((i) => i.photos))
    const photoUrls: Record<string, string> = {}
    await Promise.all(
      allPhotos.map(async (photo) => {
        const { data } = await supabase.storage
          .from('project-attachments')
          .createSignedUrl(photo.storagePath, 300)
        if (data?.signedUrl) photoUrls[photo.id] = data.signedUrl
      })
    )

    const generatedAt = new Date().toLocaleDateString('de-DE')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      createElement(AcceptancePDFDocument, {
        protocol: { ...protocol, projectName },
        settings: settingsRes.data,
        photoUrls,
        generatedAt,
      }) as any
    )

    const safe = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `abnahme_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[acceptance-pdf]', err)
    return new NextResponse('PDF-Fehler', { status: 500 })
  }
}
```

- [ ] **Step 3: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add lib/pdf/AcceptancePDFDocument.tsx app/api/projects/\[id\]/acceptance-pdf/
git commit -m "feat: acceptance protocol PDF document and API route"
```

---

## Task 11: Wire up Project Detail Page

**Files:**
- Modify: `app/(app)/projects/[id]/page.tsx`

- [ ] **Step 1: "Protokoll"-Button hinzufügen**

Öffne `app/(app)/projects/[id]/page.tsx`. Finde den Import-Block oben und füge `ClipboardCheck` zu den Lucide-Imports hinzu.

Suche die Zeile mit dem "Bearbeiten"-Link (ca. Zeile 75-85, der Abschnitt mit `<Header ... actions=`). Füge VOR dem "Bearbeiten"-Link folgenden Button ein:

```tsx
<Link
  href={`/projects/${id}/protocol`}
  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
>
  <ClipboardCheck className="w-4 h-4" />Abnahmeprotokoll
</Link>
```

- [ ] **Step 2: Import sicherstellen**

Prüfe dass `ClipboardCheck` in den Lucide-Imports enthalten ist:

```typescript
import { ..., ClipboardCheck } from 'lucide-react'
```

- [ ] **Step 3: Build prüfen**

```bash
npm run build 2>&1 | tail -20
```

Erwartung: Build grün.

- [ ] **Step 4: Manuell testen**

1. Öffne `localhost:3000/projects/[beliebige-id]`
2. Button "Abnahmeprotokoll" muss in der Header-Leiste sichtbar sein (grün)
3. Klick → navigiert zu `/projects/[id]/protocol`
4. Seite lädt Protokoll, zeigt "Noch keine Phasen"
5. "Phase hinzufügen" → z.B. "Vorabnahme" eingeben → Phase erscheint
6. "Tablet-Modus" → Vollbild mit Tabs
7. Prüfpunkt hinzufügen → Status setzen → Foto hochladen
8. "Phase abschliessen" → Unterschrift-Canvas → Speichern
9. Desktop-Ansicht zeigt Phase als ✅ abgeschlossen
10. "Freigabe-Link" generieren → Link in Clipboard → URL öffnen → Formular ausfüllen

- [ ] **Step 5: Commit + Push**

```bash
git add app/\(app\)/projects/\[id\]/page.tsx
git commit -m "feat: add Abnahmeprotokoll button to project detail"
git push origin main
```

---

## Supabase Migration

Nach Task 1 den SQL aus `prisma/migrations/manual-abnahmeprotokoll.sql` im Supabase SQL Editor ausführen. Ohne diese Migration funktionieren alle Abfragen nicht.
