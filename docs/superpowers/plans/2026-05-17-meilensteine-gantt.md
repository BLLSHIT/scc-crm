# Meilensteine Gantt-Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erweitere die MilestonesCard um eine interaktive Gantt-Ansicht mit Drag-to-Move und Drag-to-Resize, umschaltbar zwischen Liste und Gantt sowie zwischen KW- und Monatsansicht.

**Architecture:** Die bestehende `MilestonesCard` erhält einen Toggle (Liste/Gantt + KW/Mon). Eine neue `MilestoneGantt`-Komponente rendert die Zeitachse und verwaltet Drag mit nativen Pointer-Events + `setPointerCapture`. Dates werden als ISO-Strings zwischen Server und Client übergeben. Eine neue Server Action `updateMilestoneDates` speichert nach Drag-Ende.

**Tech Stack:** Next.js 15 App Router, Supabase JS, Tailwind CSS, native Pointer Events (kein @dnd-kit — für Gantt-Drag sind native Pointer Events mit `setPointerCapture` sauberer als @dnd-kit, das für Listen-DnD ausgelegt ist)

---

## File Structure

| Datei | Aktion | Verantwortung |
|-------|--------|---------------|
| `prisma/migrations/manual-meilensteine-gantt.sql` | Create | DB-Migration: startDate hinzufügen, Aufbau migrieren, endDate/type entfernen |
| `lib/validations/project.schema.ts` | Modify | `milestoneSchema`: startDate hinzufügen, endDate/type entfernen |
| `lib/db/projects.ts` | Modify | `getProjects` select: endDate/type → startDate |
| `lib/actions/projects.actions.ts` | Modify | `addMilestone` um startDate erweitern; neue Action `updateMilestoneDates` |
| `components/projects/MilestoneGantt.tsx` | Create | Gantt-Renderer + Drag-Logik |
| `components/projects/MilestonesCard.tsx` | Modify | Toggle-Buttons, startDate im Formular, MilestoneGantt einbinden |

---

## Task 1: SQL Migration

**Files:**
- Create: `prisma/migrations/manual-meilensteine-gantt.sql`

- [ ] **Step 1: Erstelle die Migration-Datei**

```sql
-- prisma/migrations/manual-meilensteine-gantt.sql

-- 1. Neues startDate-Feld hinzufügen
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS "startDate" DATE;

-- 2. Aufbau-Meilensteine migrieren:
--    bisher: dueDate = Starttermin, endDate = Endtermin
--    neu:    startDate = Starttermin, dueDate = Endtermin
UPDATE public.project_milestones
SET
  "startDate" = "dueDate"::DATE,
  "dueDate"   = "endDate"
WHERE type = 'aufbau' AND "endDate" IS NOT NULL;

-- 3. Veraltete Felder entfernen
ALTER TABLE public.project_milestones
  DROP COLUMN IF EXISTS "endDate",
  DROP COLUMN IF EXISTS type;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: SQL im Supabase SQL Editor ausführen**

Öffne das Supabase-Dashboard → SQL Editor → füge den Inhalt von `prisma/migrations/manual-meilensteine-gantt.sql` ein → Run.

Erwartetes Ergebnis: keine Fehler, Spalten `endDate` und `type` verschwinden aus `project_milestones`, `startDate` erscheint.

- [ ] **Step 3: Commit**

```bash
cd /Users/jhj/scc-crm
git add prisma/migrations/manual-meilensteine-gantt.sql
git commit -m "feat: add startDate migration for milestone Gantt"
```

---

## Task 2: Schema & DB-Schicht aktualisieren

**Files:**
- Modify: `lib/validations/project.schema.ts:28-35`
- Modify: `lib/db/projects.ts:23`

- [ ] **Step 1: milestoneSchema in `lib/validations/project.schema.ts` aktualisieren**

Ersetze die bestehenden Zeilen 28–35:

```typescript
export const milestoneSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
})

export type MilestoneInput = z.infer<typeof milestoneSchema>
```

- [ ] **Step 2: `getProjects`-Select in `lib/db/projects.ts` aktualisieren**

Zeile 23 — ersetze `dueDate, endDate, type, completedAt, sortOrder` durch `startDate, dueDate, completedAt, sortOrder`:

```typescript
       milestones:project_milestones(id, title, startDate, dueDate, completedAt, sortOrder)`
```

- [ ] **Step 3: Bauen und auf Fehler prüfen**

```bash
cd /Users/jhj/scc-crm && npm run build 2>&1 | tail -20
```

Erwartetes Ergebnis: kein TypeScript-Fehler.

- [ ] **Step 4: Commit**

```bash
git add lib/validations/project.schema.ts lib/db/projects.ts
git commit -m "feat: add startDate to milestoneSchema and DB select"
```

---

## Task 3: Server Actions erweitern

**Files:**
- Modify: `lib/actions/projects.actions.ts:194-248`

- [ ] **Step 1: `addMilestone` um `startDate` erweitern**

Ersetze die `addMilestone`-Funktion (Zeilen 194–219) durch:

```typescript
export async function addMilestone(projectId: string, input: MilestoneInput): Promise<ActionResult> {
  const parsed = milestoneSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }

  const { data: existing } = await supabase
    .from('project_milestones').select('sortOrder').eq('projectId', projectId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1

  const { error } = await supabase.from('project_milestones').insert({
    id: randomUUID(),
    projectId,
    title: parsed.data.title.trim(),
    description: parsed.data.description?.trim() || null,
    startDate: parsed.data.startDate || null,
    dueDate: parsed.data.dueDate || null,
    sortOrder: nextSort,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${projectId}`)
  return {}
}
```

- [ ] **Step 2: Neue Action `updateMilestoneDates` hinzufügen**

Füge nach `deleteMilestone` (nach Zeile 248) ein:

```typescript
export async function updateMilestoneDates(
  milestoneId: string,
  startDate: string | null,
  dueDate: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: row } = await supabase
    .from('project_milestones').select('projectId').eq('id', milestoneId).single()
  if (!row) return { error: { _form: ['Meilenstein nicht gefunden.'] } }
  const { error } = await supabase
    .from('project_milestones')
    .update({ startDate: startDate || null, dueDate, updatedAt: new Date().toISOString() })
    .eq('id', milestoneId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/projects/${row.projectId}`)
  return {}
}
```

- [ ] **Step 3: Bauen**

```bash
cd /Users/jhj/scc-crm && npm run build 2>&1 | tail -20
```

Erwartetes Ergebnis: keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/projects.actions.ts
git commit -m "feat: extend addMilestone with startDate, add updateMilestoneDates action"
```

---

## Task 4: MilestoneGantt-Komponente erstellen

**Files:**
- Create: `components/projects/MilestoneGantt.tsx`

- [ ] **Step 1: Erstelle die Datei mit Datums-Hilfsfunktionen und Typen**

```typescript
'use client'
import { useRef, useState } from 'react'

export interface GanttMilestone {
  id: string
  title: string
  startDate?: string | null
  dueDate?: string | null
  completedAt?: string | null
}

interface Props {
  milestones: GanttMilestone[]
  scale: 'kw' | 'mon'
  onDatesChange: (id: string, startDate: string | null, dueDate: string) => void
}

type DragState = {
  type: 'move' | 'left' | 'right'
  milestoneId: string
  startX: number
  origStart: Date | null
  origDue: Date
}

// ─── Date helpers ───────────────────────────────────────────────────────────
function isoToDate(s: string): Date { return new Date(s + 'T00:00:00') }
function dateToIso(d: Date): string { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function addMonths(d: Date, n: number): Date { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isoWeek(d: Date): number {
  const thu = new Date(d)
  thu.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const jan1 = new Date(thu.getFullYear(), 0, 1)
  return Math.ceil(((thu.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
}

function monthLabel(d: Date): string {
  return d.toLocaleString('de-DE', { month: 'short', year: '2-digit' })
}

// ─── Column helpers ─────────────────────────────────────────────────────────
function buildColumns(milestones: GanttMilestone[], scale: 'kw' | 'mon'): Date[] {
  const dates: Date[] = []
  for (const m of milestones) {
    if (m.startDate) dates.push(isoToDate(m.startDate))
    if (m.dueDate) dates.push(isoToDate(m.dueDate))
  }
  const now = new Date()
  if (dates.length === 0) {
    dates.push(addMonths(now, -1), addMonths(now, 3))
  }
  const min = new Date(Math.min(...dates.map(d => d.getTime())))
  const max = new Date(Math.max(...dates.map(d => d.getTime())))
  const bufStart = scale === 'kw' ? addDays(min, -14) : addMonths(min, -1)
  const bufEnd   = scale === 'kw' ? addDays(max, 21)  : addMonths(max, 2)

  const cols: Date[] = []
  if (scale === 'kw') {
    let cur = startOfWeek(bufStart)
    while (cur <= bufEnd) { cols.push(new Date(cur)); cur = addDays(cur, 7) }
  } else {
    let cur = startOfMonth(bufStart)
    while (cur <= bufEnd) { cols.push(new Date(cur)); cur = addMonths(cur, 1) }
  }
  return cols
}

function dateToColIdx(d: Date, columns: Date[], scale: 'kw' | 'mon'): number {
  const target = (scale === 'kw' ? startOfWeek(d) : startOfMonth(d)).getTime()
  const idx = columns.findIndex(c => c.getTime() === target)
  return Math.max(0, idx >= 0 ? idx : columns.length - 1)
}

const LABEL_COLS = 1 // CSS grid: first column is the label

// ─── Component ──────────────────────────────────────────────────────────────
export function MilestoneGantt({ milestones, scale, onDatesChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [visualDx, setVisualDx] = useState(0)

  const columns = buildColumns(milestones, scale)
  const todayCol = dateToColIdx(new Date(), columns, scale)

  function colWidth(): number {
    if (!containerRef.current) return 40
    return (containerRef.current.clientWidth - 130) / columns.length
  }

  function startDrag(e: React.PointerEvent, type: DragState['type'], m: GanttMilestone) {
    if (m.completedAt) return
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
    dragRef.current = {
      type,
      milestoneId: m.id,
      startX: e.clientX,
      origStart: m.startDate ? isoToDate(m.startDate) : null,
      origDue: m.dueDate ? isoToDate(m.dueDate) : new Date(),
    }
    setDraggingId(m.id)
    setVisualDx(0)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    setVisualDx(e.clientX - dragRef.current.startX)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return
    const { type, milestoneId, startX, origStart, origDue } = dragRef.current
    const cw = colWidth()
    const colsDelta = Math.round((e.clientX - startX) / cw)
    dragRef.current = null
    setDraggingId(null)
    setVisualDx(0)

    if (colsDelta === 0) return

    function shiftDate(d: Date, n: number): Date {
      return scale === 'kw' ? addDays(d, n * 7) : addMonths(d, n)
    }

    if (type === 'move') {
      const newStart = origStart ? shiftDate(origStart, colsDelta) : null
      const newDue = shiftDate(origDue, colsDelta)
      onDatesChange(milestoneId, newStart ? dateToIso(newStart) : null, dateToIso(newDue))
    } else if (type === 'left' && origStart) {
      const newStart = shiftDate(origStart, colsDelta)
      if (newStart < origDue) {
        onDatesChange(milestoneId, dateToIso(newStart), dateToIso(origDue))
      }
    } else if (type === 'right') {
      const newDue = shiftDate(origDue, colsDelta)
      const minDue = origStart
        ? shiftDate(origStart, scale === 'kw' ? 1 : 1)
        : origDue
      if (newDue >= minDue) {
        onDatesChange(milestoneId, origStart ? dateToIso(origStart) : null, dateToIso(newDue))
      }
    }
  }

  const gridCols = `130px repeat(${columns.length}, 1fr)`

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto rounded-lg border border-slate-100"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div style={{ minWidth: Math.max(500, 130 + columns.length * 36) }}>
        {/* Header row */}
        <div
          className="grid border-b border-slate-100 pb-1 mb-1"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div />
          {columns.map((col, i) => (
            <div
              key={i}
              className={`text-[9px] font-medium truncate px-0.5 ${
                i === todayCol ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              {scale === 'kw' ? `KW ${isoWeek(col)}` : monthLabel(col)}
            </div>
          ))}
        </div>

        {/* Milestone rows */}
        {milestones.map((m) => {
          const isDone = !!m.completedAt
          const hasRange = !!m.startDate && !!m.dueDate
          const start = m.startDate ? isoToDate(m.startDate) : null
          const due   = m.dueDate   ? isoToDate(m.dueDate)   : null

          const colStart = start ? dateToColIdx(start, columns, scale) : (due ? dateToColIdx(due, columns, scale) : 0)
          const colEnd   = due   ? dateToColIdx(due,   columns, scale) : colStart
          const colSpan  = Math.max(1, colEnd - colStart + 1)

          const isDragging = draggingId === m.id
          const dx = isDragging ? visualDx : 0

          return (
            <div
              key={m.id}
              className="grid items-center mb-1.5"
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* Label */}
              <div className={`text-[10px] pr-2 truncate flex items-center gap-1 ${isDone ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                {isDone ? '✓' : '○'} {m.title}
              </div>

              {/* Empty cells before bar */}
              {colStart > 0 && (
                <div style={{ gridColumn: `2 / span ${colStart}` }} />
              )}

              {/* Bar or diamond */}
              {hasRange ? (
                <div
                  style={{
                    gridColumn: `${colStart + 2} / span ${colSpan}`,
                    transform: `translateX(${dx}px)`,
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => startDrag(e, 'move', m)}
                  className={`h-5 rounded relative flex items-center justify-center select-none ${
                    isDone
                      ? 'bg-emerald-400/60 cursor-default'
                      : 'bg-blue-500 cursor-grab shadow-sm shadow-blue-200'
                  }`}
                >
                  {/* Left resize handle */}
                  {!isDone && (
                    <div
                      className="absolute left-1 top-1 w-0.5 h-3 bg-white/60 rounded cursor-ew-resize"
                      onPointerDown={(e) => startDrag(e, 'left', m)}
                    />
                  )}
                  <span className="text-[8px] text-white font-medium truncate px-3 pointer-events-none">
                    {dateToIso(isoToDate(m.startDate!))} – {dateToIso(isoToDate(m.dueDate!))}
                  </span>
                  {/* Right resize handle */}
                  {!isDone && (
                    <div
                      className="absolute right-1 top-1 w-0.5 h-3 bg-white/60 rounded cursor-ew-resize"
                      onPointerDown={(e) => startDrag(e, 'right', m)}
                    />
                  )}
                </div>
              ) : due ? (
                /* Diamond: single date */
                <div
                  style={{ gridColumn: `${colStart + 2} / span 1` }}
                  className="flex items-center justify-center"
                >
                  <div
                    className={`w-3 h-3 rotate-45 ${isDone ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    title={m.dueDate ?? ''}
                  />
                </div>
              ) : null}

              {/* Today column highlight */}
              {/* (handled by header color, no overlay needed) */}
            </div>
          )
        })}

        {/* Today line */}
        <div className="mt-2 pt-1.5 border-t border-dashed border-red-200 flex items-center gap-1.5">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-[5px] border-l-transparent border-r-transparent border-t-red-400" />
          <span className="text-[9px] text-red-400 font-medium">
            Heute ·{' '}
            {scale === 'kw'
              ? `KW ${isoWeek(new Date())}`
              : new Date().toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Bauen**

```bash
cd /Users/jhj/scc-crm && npm run build 2>&1 | tail -20
```

Erwartetes Ergebnis: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add components/projects/MilestoneGantt.tsx
git commit -m "feat: add MilestoneGantt component with drag-to-move and resize"
```

---

## Task 5: MilestonesCard aktualisieren

**Files:**
- Modify: `components/projects/MilestonesCard.tsx`

- [ ] **Step 1: Ersetze die gesamte Datei**

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, CheckCircle2, Circle, CalendarClock, ListChecks, BarChart2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { addMilestone, toggleMilestone, deleteMilestone, updateMilestoneDates } from '@/lib/actions/projects.actions'
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal'
import { MilestoneGantt } from '@/components/projects/MilestoneGantt'

interface Milestone {
  id: string
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  completedAt?: string | null
  sortOrder: number
}

interface Props {
  projectId: string
  milestones: Milestone[]
}

export function MilestonesCard({ projectId, milestones }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'gantt'>('list')
  const [scale, setScale] = useState<'kw' | 'mon'>('kw')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const completed = milestones.filter((m) => m.completedAt).length
  const total = milestones.length
  const progress = total > 0 ? (completed / total) * 100 : 0

  function handleAdd() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addMilestone(projectId, {
        title,
        description,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        sortOrder: 0,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setTitle(''); setDescription(''); setStartDate(''); setDueDate(''); setShowForm(false)
      router.refresh()
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => { await toggleMilestone(id); router.refresh() })
  }

  function handleDelete(id: string) {
    if (!confirm('Diesen Meilenstein wirklich löschen?')) return
    startTransition(async () => { await deleteMilestone(id); router.refresh() })
  }

  function handleDatesChange(id: string, newStart: string | null, newDue: string) {
    startTransition(async () => { await updateMilestoneDates(id, newStart, newDue); router.refresh() })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Meilensteine ({completed}/{total})</span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Liste / Gantt toggle */}
            <div className="flex bg-slate-100 rounded-md p-0.5 gap-0.5">
              <Button
                type="button" size="sm" variant={view === 'list' ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setView('list')}
              >
                ☰ Liste
              </Button>
              <Button
                type="button" size="sm" variant={view === 'gantt' ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setView('gantt')}
              >
                <BarChart2 className="w-3 h-3 mr-1" />Gantt
              </Button>
            </div>

            {/* KW / Mon toggle — nur im Gantt */}
            {view === 'gantt' && (
              <div className="flex bg-slate-100 rounded-md p-0.5 gap-0.5">
                <Button
                  type="button" size="sm" variant={scale === 'kw' ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setScale('kw')}
                >KW</Button>
                <Button
                  type="button" size="sm" variant={scale === 'mon' ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setScale('mon')}
                >Mon</Button>
              </div>
            )}

            <Button type="button" size="sm" variant="outline" onClick={() => setShowImport(true)}>
              <ListChecks className="w-4 h-4 mr-1" />Vorlage laden
            </Button>
            {!showForm && (
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />Meilenstein
              </Button>
            )}
          </div>
        </CardTitle>
        {total > 0 && (
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {showForm && (
          <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel des Meilensteins" autoFocus />
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung (optional)" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                placeholder="Von (optional)" />
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                placeholder="Bis / Fällig am" />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAdd}>Hinzufügen</Button>
              <Button type="button" size="sm" variant="outline"
                onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setStartDate(''); setDueDate('') }}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {milestones.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Meilensteine.</p>
        ) : view === 'gantt' ? (
          <MilestoneGantt milestones={milestones} scale={scale} onDatesChange={handleDatesChange} />
        ) : (
          <ul className="space-y-1.5">
            {milestones.map((m) => {
              const isDone = !!m.completedAt
              const isOverdue = !isDone && m.dueDate
                && new Date(m.dueDate) < new Date(new Date().toDateString())
              const dateLabel = m.startDate && m.dueDate
                ? `${formatDate(m.startDate)} – ${formatDate(m.dueDate)}`
                : m.dueDate ? formatDate(m.dueDate) : null
              return (
                <li key={m.id}
                  className="flex items-start gap-2 group p-2 -mx-2 rounded-md hover:bg-slate-50">
                  <button type="button" onClick={() => handleToggle(m.id)} className="mt-0.5 flex-shrink-0">
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      : <Circle className="w-4 h-4 text-slate-300 hover:text-slate-500" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {m.title}
                    </p>
                    {m.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                    )}
                    {dateLabel && (
                      <p className={`text-xs flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                        <CalendarClock className="w-3 h-3" />{dateLabel}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => handleDelete(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
      <ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
    </Card>
  )
}
```

- [ ] **Step 2: Bauen**

```bash
cd /Users/jhj/scc-crm && npm run build 2>&1 | tail -20
```

Erwartetes Ergebnis: keine TypeScript-Fehler.

- [ ] **Step 3: Commit**

```bash
git add components/projects/MilestonesCard.tsx
git commit -m "feat: add Gantt toggle and startDate form field to MilestonesCard"
```

---

## Self-Review

**Spec-Abdeckung:**
- ✅ `startDate` hinzugefügt (Task 1–2)
- ✅ `endDate`/`type` entfernt mit Migration (Task 1)
- ✅ Aufbau-Meilensteine migriert (Task 1, Step 1)
- ✅ Toggle Liste/Gantt + KW/Mon (Task 5)
- ✅ Drag-to-move (Task 4, `type === 'move'`)
- ✅ Drag-to-resize links/rechts (Task 4, `type === 'left'`/`'right'`)
- ✅ Optimistisches Update via `useTransition` + `router.refresh()` (Task 5)
- ✅ Heute-Linie (Task 4)
- ✅ Diamant für Meilensteine ohne `startDate` (Task 4)
- ✅ Erledigte Meilensteine: kein Drag (Task 4, `if (m.completedAt) return`)
- ✅ `getProjects` Select aktualisiert (Task 2)
- ✅ Share-Seite unverändert — selektiert nur `id, title, completedAt, sortOrder` (kein Impact)

**Placeholder-Scan:** Keine TBDs, keine vagen Schritte.

**Typ-Konsistenz:**
- `GanttMilestone` in `MilestoneGantt.tsx` hat `startDate`, `dueDate` — passt zur `Milestone`-Interface in `MilestonesCard.tsx`
- `updateMilestoneDates(id, startDate | null, dueDate)` — konsistent zwischen Action-Definition (Task 3) und Aufruf in `handleDatesChange` (Task 5)
- `MilestoneInput` in `milestoneSchema` hat `startDate` optional — passt zum `addMilestone`-Aufruf in Task 5
