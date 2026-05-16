# Projekte & Abnahme — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the projects list with Bautrupp/PL/Milestone columns and a completed-projects toggle, replace the Auslastung tab with a functional Gantt calendar, add a Reklamationen module to project detail, and fix + improve the Abnahmeprotokoll (inline desktop editing, position field, tablet colour scheme, photo bug fix).

**Architecture:** Next.js 15 App Router with Supabase Postgres. Server Components for data fetching, Client Components for interactivity. All DB changes via manual SQL migrations in `prisma/migrations/`. No external Gantt library — pure CSS Grid/position math.

**Tech Stack:** Next.js 15, TypeScript, Supabase, Tailwind CSS, react-hook-form + zod, lucide-react

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/migrations/manual-projekte-abnahme-redesign.sql` | **create** | All 4 schema changes |
| `lib/validations/team-member.schema.ts` | modify | Add `abbreviation` field |
| `lib/actions/team-members.actions.ts` | modify | Save `abbreviation` |
| `lib/db/team-members.ts` | modify | Return `abbreviation` in queries |
| `components/team/TeamMemberForm.tsx` | modify | Show Kürzel input |
| `app/(app)/teams/[id]/edit/page.tsx` | modify | Pass `abbreviation` defaultValue |
| `lib/db/projects.ts` | modify | Load milestones + abbreviation in `getProjects` |
| `app/(app)/projects/page.tsx` | modify | New columns, showCompleted toggle |
| `components/projects/ProjectGanttCalendar.tsx` | **create** | Gantt chart component |
| `lib/actions/reclamations.actions.ts` | **create** | CRUD for project_reclamations |
| `components/projects/ReclamationCard.tsx` | **create** | Reklamation UI |
| `app/(app)/projects/[id]/page.tsx` | modify | Add ReclamationCard |
| `components/acceptance/AcceptanceItemSheet.tsx` | modify | Photo bug fix + position field |
| `lib/actions/acceptance-protocol.actions.ts` | modify | Add `position` to updateItem |
| `lib/db/acceptance-protocol.ts` | modify | Add `position` to AcceptanceItem type |
| `components/acceptance/AcceptancePhasesTabs.tsx` | modify | Green colour scheme |
| `components/acceptance/AcceptanceDesktopOverview.tsx` | modify | Inline editing |

---

### Task 1: DB Migrations

**Files:**
- Create: `prisma/migrations/manual-projekte-abnahme-redesign.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- prisma/migrations/manual-projekte-abnahme-redesign.sql

-- 1. Kürzel für Teammitglieder
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS abbreviation TEXT;

-- 2. Position/Anlage für Abnahme-Prüfpunkte
ALTER TABLE public.acceptance_items
  ADD COLUMN IF NOT EXISTS position TEXT;

-- 3. Typ + Enddatum für Meilensteine (Aufbau-Meilenstein)
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'regular'
    CHECK (type IN ('regular', 'aufbau')),
  ADD COLUMN IF NOT EXISTS "endDate" DATE;

-- 4. Reklamationen an AFP
CREATE TABLE IF NOT EXISTS public.project_reclamations (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "courtRef" TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved')),
  "reportedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "resolvedAt" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_reclamations_project
  ON public.project_reclamations("projectId", "createdAt");

ALTER TABLE public.project_reclamations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all project_reclamations"
  ON public.project_reclamations FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Run migration in Supabase SQL editor**

Open Supabase → SQL Editor → paste and run the file content. Verify: no errors, all columns appear in Table Editor.

- [ ] **Step 3: Verify columns exist**

In Supabase Table Editor check:
- `team_members` has `abbreviation` (text, nullable)
- `acceptance_items` has `position` (text, nullable)
- `project_milestones` has `type` (text, default 'regular') and `endDate` (date, nullable)
- Table `project_reclamations` exists with all columns

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/manual-projekte-abnahme-redesign.sql
git commit -m "feat: add DB migrations for Projekte & Abnahme redesign"
```

---

### Task 2: Kürzel-Feld in Stammdaten

**Files:**
- Modify: `lib/validations/team-member.schema.ts`
- Modify: `lib/actions/team-members.actions.ts`
- Modify: `lib/db/team-members.ts`
- Modify: `components/team/TeamMemberForm.tsx`
- Modify: `app/(app)/teams/[id]/edit/page.tsx`

- [ ] **Step 1: Extend the validation schema**

Replace the content of `lib/validations/team-member.schema.ts`:

```typescript
import { z } from 'zod'

export const teamMemberSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  email: z.string().email('Ungültige E-Mail'),
  mobile: z.string().optional(),
  position: z.string().optional(),
  abbreviation: z.string().max(10).optional(),
  isActive: z.coerce.boolean().default(true),
})

export type TeamMemberInput = z.infer<typeof teamMemberSchema>
```

- [ ] **Step 2: Update the `clean` function in the action**

In `lib/actions/team-members.actions.ts`, replace the `clean` function:

```typescript
function clean(input: TeamMemberInput) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile?.trim() || null,
    position: input.position?.trim() || null,
    abbreviation: input.abbreviation?.trim().toUpperCase() || null,
    isActive: input.isActive,
  }
}
```

- [ ] **Step 3: Update DB queries to return abbreviation**

In `lib/db/team-members.ts`, update both selects to include `abbreviation`:

```typescript
// In getTeamMembers():
.select('id, firstName, lastName, email, mobile, position, abbreviation, isActive, createdAt')

// In getActiveTeamMemberOptions():
.select('id, firstName, lastName, email, mobile, position, abbreviation')

// In getTeamMemberById():
.select('*')   // already selects all — no change needed
```

- [ ] **Step 4: Add Kürzel field to TeamMemberForm**

In `components/team/TeamMemberForm.tsx`, add `abbreviation` to the form. Insert after the mobile/position grid (before the isActive checkbox):

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-1.5">
    <Label htmlFor="mobile">Mobilnummer</Label>
    <Input id="mobile" type="tel" placeholder="+49 …" {...register('mobile')} />
  </div>
  <div className="space-y-1.5">
    <Label htmlFor="position">Position</Label>
    <Input id="position" placeholder="z.B. Sales Lead" {...register('position')} />
  </div>
</div>

<div className="space-y-1.5">
  <Label htmlFor="abbreviation">Kürzel <span className="text-slate-400 font-normal">(max. 2–3 Zeichen, z.B. JH)</span></Label>
  <Input id="abbreviation" placeholder="JH" maxLength={10} className="w-24 uppercase" {...register('abbreviation')} />
  {errors.abbreviation && (
    <p className="text-xs text-red-500">{errors.abbreviation.message}</p>
  )}
</div>
```

- [ ] **Step 5: Pass abbreviation defaultValue in edit page**

In `app/(app)/teams/[id]/edit/page.tsx`, update the `defaultValues` prop passed to `TeamMemberForm`:

```tsx
defaultValues={{
  firstName: member.firstName ?? '',
  lastName: member.lastName ?? '',
  email: member.email ?? '',
  mobile: member.mobile ?? '',
  position: member.position ?? '',
  abbreviation: member.abbreviation ?? '',
  isActive: member.isActive ?? true,
}}
```

- [ ] **Step 6: Verify**

Run `npm run build` — no TypeScript errors. Navigate to `/teams`, click a member → Edit. The Kürzel field appears. Enter "JH", save. Check in Supabase Table Editor that `abbreviation = 'JH'` is stored.

- [ ] **Step 7: Commit**

```bash
git add lib/validations/team-member.schema.ts lib/actions/team-members.actions.ts lib/db/team-members.ts components/team/TeamMemberForm.tsx "app/(app)/teams/[id]/edit/page.tsx"
git commit -m "feat: add abbreviation (Kürzel) field to team members"
```

---

### Task 3: Projektliste — neue Spalten + Toggle

**Files:**
- Modify: `lib/db/projects.ts`
- Modify: `app/(app)/projects/page.tsx`

- [ ] **Step 1: Extend getProjects to load milestones and abbreviation**

In `lib/db/projects.ts`, update `getProjects`:

```typescript
export interface ProjectFilters {
  q?: string
  status?: ProjectStatus
  teamMemberId?: string
  companyId?: string
  showCompleted?: boolean
}

export async function getProjects(filters: ProjectFilters = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('projects')
    .select(
      `id, name, status, startDate, plannedEndDate, actualEndDate, locationCity, buildTeamId, createdAt,
       company:companies(id, name),
       teamMember:team_members(id, firstName, lastName, abbreviation),
       buildTeam:build_teams(id, name),
       deal:deals(id, title, value, currency),
       milestones:project_milestones(id, title, dueDate, endDate, type, completedAt, sortOrder)`
    )
    .order('createdAt', { ascending: false })
  if (filters.q) {
    query = query.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (!filters.showCompleted) query = query.neq('status', 'completed')
  if (filters.teamMemberId) query = query.eq('teamMemberId', filters.teamMemberId)
  if (filters.companyId) query = query.eq('companyId', filters.companyId)
  const { data, error } = await query
  if (error) {
    console.error('[getProjects] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}
```

- [ ] **Step 2: Update the projects list page**

Replace `app/(app)/projects/page.tsx` with the full updated version:

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjects, type ProjectStatus } from '@/lib/db/projects'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { ProjectKanbanBoard } from '@/components/projects/ProjectKanbanBoard'
import { ProjectGanttCalendar } from '@/components/projects/ProjectGanttCalendar'
import { Plus, LayoutList, Kanban, CalendarDays } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

const STATUS_FILTERS: { label: string; value?: ProjectStatus }[] = [
  { label: 'Alle' },
  { label: 'Planung', value: 'planning' },
  { label: 'Bestellt', value: 'ordered' },
  { label: 'Installation', value: 'installation' },
  { label: 'Pausiert', value: 'on_hold' },
  { label: 'Storniert', value: 'cancelled' },
]

const STATUS_BADGE: Record<ProjectStatus, string> = {
  planning: 'bg-blue-100 text-blue-700',
  ordered: 'bg-violet-100 text-violet-700',
  installation: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: 'Planung',
  ordered: 'Material bestellt',
  installation: 'In Installation',
  completed: 'Abgeschlossen',
  on_hold: 'Pausiert',
  cancelled: 'Storniert',
}

const MILESTONE_TYPE_LABEL: Record<string, string> = {
  regular: '',
  aufbau: '🔨',
}

type ViewMode = 'list' | 'board' | 'kalender'

function initials(tm: { firstName: string; lastName: string; abbreviation?: string | null }) {
  if (tm.abbreviation) return tm.abbreviation
  return `${tm.firstName[0] ?? ''}${tm.lastName[0] ?? ''}`.toUpperCase()
}

function MilestoneTag({ m }: { m: any }) {
  const isAufbau = m.type === 'aufbau'
  const isDone = !!m.completedAt

  if (isAufbau) {
    const start = m.dueDate ? new Date(m.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '?'
    const end = m.endDate ? new Date(m.endDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '?'
    return (
      <span className="inline-flex bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[0.68rem] font-semibold whitespace-nowrap">
        🔨 Aufbau · {start} – {end}
      </span>
    )
  }

  const date = m.dueDate ? new Date(m.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : ''
  if (isDone) {
    return (
      <span className="inline-flex bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[0.68rem] whitespace-nowrap">
        ✓ {m.title}{date ? ` · ${date}` : ''}
      </span>
    )
  }
  return (
    <span className="inline-flex bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[0.68rem] whitespace-nowrap">
      ⚑ {m.title}{date ? ` · ${date}` : ''}
    </span>
  )
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: ProjectStatus; view?: string; showCompleted?: string }>
}) {
  const params = await searchParams
  const view: ViewMode = params.view === 'board' ? 'board' : params.view === 'kalender' ? 'kalender' : 'list'
  const showCompleted = params.showCompleted === '1'

  let profile: Profile | null = null
  let projects: any[] = []
  let completedCount = 0

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    projects = await getProjects({
      q: params.q,
      status: view === 'list' ? params.status : undefined,
      showCompleted: view !== 'list' ? true : showCompleted,
    })

    if (view === 'list' && !showCompleted) {
      const { count } = await supabase
        .from('projects').select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
      completedCount = count ?? 0
    }
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Projekte laden" err={err} />
  }

  function viewLink(v: ViewMode) {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    sp.set('view', v)
    if (showCompleted) sp.set('showCompleted', '1')
    return `/projects?${sp.toString()}`
  }

  function toggleCompletedLink() {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.status) sp.set('status', params.status)
    sp.set('view', 'list')
    if (!showCompleted) sp.set('showCompleted', '1')
    return `/projects?${sp.toString()}`
  }

  const viewBtnBase = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors'
  const viewBtnActive = 'bg-slate-900 text-white'
  const viewBtnInactive = 'text-slate-600 hover:bg-slate-100 border border-slate-200'

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Projekte (${projects.length})`}
        profile={profile}
        actions={
          <Link href="/projects/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />Projekt
          </Link>
        }
      />
      <main className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBar placeholder="Projekte durchsuchen…" />

          {view === 'list' && (
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map((f) => {
                const active = (params.status ?? undefined) === f.value
                const href = f.value ? `/projects?status=${f.value}` : '/projects'
                return (
                  <Link key={f.label} href={href}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}>
                    {f.label}
                  </Link>
                )
              })}
            </div>
          )}

          {view === 'list' && (
            <Link
              href={toggleCompletedLink()}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                showCompleted
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`inline-block w-7 h-4 rounded-full transition-colors relative ${showCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${showCompleted ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </span>
              Abgeschlossene
            </Link>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Link href={viewLink('list')} className={`${viewBtnBase} ${view === 'list' ? viewBtnActive : viewBtnInactive}`}>
              <LayoutList className="w-3.5 h-3.5" />Liste
            </Link>
            <Link href={viewLink('board')} className={`${viewBtnBase} ${view === 'board' ? viewBtnActive : viewBtnInactive}`}>
              <Kanban className="w-3.5 h-3.5" />Board
            </Link>
            <Link href={viewLink('kalender')} className={`${viewBtnBase} ${view === 'kalender' ? viewBtnActive : viewBtnInactive}`}>
              <CalendarDays className="w-3.5 h-3.5" />Kalender
            </Link>
          </div>
        </div>

        {/* Hint bar for hidden completed projects */}
        {view === 'list' && !showCompleted && completedCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <span>{completedCount} abgeschlossene {completedCount === 1 ? 'Projekt' : 'Projekte'} ausgeblendet</span>
            <Link href={toggleCompletedLink()} className="underline hover:no-underline">Einblenden</Link>
          </div>
        )}

        {/* ── List View ── */}
        {view === 'list' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Projekt</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Kunde</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Bautrupp</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">PL</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Meilensteine</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Auftragswert</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        Keine Projekte.{' '}
                        <Link href="/projects/new" className="text-blue-600 hover:underline">
                          Erstes Projekt anlegen
                        </Link>
                      </td>
                    </tr>
                  )}
                  {projects.map((p: any) => {
                    const tm = p.teamMember
                    const milestones = (p.milestones ?? []).slice().sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                    const isCompleted = p.status === 'completed'
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 ${isCompleted ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.company?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGE[p.status as ProjectStatus]}`}>
                            {STATUS_LABEL[p.status as ProjectStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.buildTeam?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          {tm ? (
                            <span
                              title={`${tm.firstName} ${tm.lastName}`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#036147] text-white text-[0.68rem] font-bold"
                            >
                              {initials(tm)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {milestones.map((m: any) => (
                              <MilestoneTag key={m.id} m={m} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {p.deal?.value ? formatCurrency(Number(p.deal.value), p.deal.currency ?? 'EUR') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Board View ── */}
        {view === 'board' && <ProjectKanbanBoard initialProjects={projects} />}

        {/* ── Kalender View ── */}
        {view === 'kalender' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Projekte nach Startdatum · aktuelle 6 Monate · abgeschlossene ausgeblendet
            </p>
            <ProjectGanttCalendar projects={projects} />
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/jhj/scc-crm && npm run build
```

Expected: No TypeScript errors. (ProjectGanttCalendar import will fail until Task 4 — create a stub first if needed.)

- [ ] **Step 4: Commit**

```bash
git add lib/db/projects.ts "app/(app)/projects/page.tsx"
git commit -m "feat: update projects list with Bautrupp, PL Kürzel, milestones columns and completed toggle"
```

---

### Task 4: Gantt-Kalender

**Files:**
- Create: `components/projects/ProjectGanttCalendar.tsx`

- [ ] **Step 1: Create the Gantt component**

Create `components/projects/ProjectGanttCalendar.tsx`:

```tsx
'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Milestone {
  id: string
  title: string
  dueDate: string | null
  endDate: string | null
  type: string
  completedAt: string | null
}

interface Project {
  id: string
  name: string
  startDate: string | null
  plannedEndDate: string | null
  buildTeam: { id: string; name: string } | null
  milestones: Milestone[]
}

interface Props {
  projects: Project[]
}

// Deterministic colour per build-team index (sorted alphabetically)
const TEAM_COLOURS = [
  '#036147', // green (Trupp A)
  '#d97706', // amber (Trupp B)
  '#7c3aed', // violet (Trupp C)
  '#0369a1', // blue (Trupp D)
  '#be185d', // pink (Trupp E)
  '#065f46', // dark green (Trupp F)
]

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function pct(date: Date, windowStart: Date, totalMs: number): number {
  return Math.max(0, Math.min(100, ((date.getTime() - windowStart.getTime()) / totalMs) * 100))
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export function ProjectGanttCalendar({ projects }: Props) {
  const [offset, setOffset] = useState(0) // months offset from today

  const windowStart = useMemo(() => {
    const d = startOfMonth(new Date())
    return addMonths(d, offset)
  }, [offset])

  const windowEnd = useMemo(() => endOfMonth(addMonths(windowStart, 5)), [windowStart])
  const totalMs = windowEnd.getTime() - windowStart.getTime()
  const todayPct = pct(new Date(), windowStart, totalMs)

  // Build team colour map
  const teamColourMap = useMemo(() => {
    const names = [...new Set(projects.map(p => p.buildTeam?.name).filter(Boolean) as string[])].sort()
    const map: Record<string, string> = {}
    names.forEach((name, i) => { map[name] = TEAM_COLOURS[i % TEAM_COLOURS.length] })
    return map
  }, [projects])

  // Sort projects by startDate
  const sorted = useMemo(() =>
    [...projects]
      .filter(p => p.startDate || p.plannedEndDate)
      .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? '')),
    [projects]
  )

  const months = Array.from({ length: 6 }, (_, i) => addMonths(windowStart, i))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
        <button
          onClick={() => setOffset(o => o - 1)}
          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-900 min-w-[160px] text-center">
          {MONTH_NAMES[windowStart.getMonth()]} {windowStart.getFullYear()} –{' '}
          {MONTH_NAMES[windowEnd.getMonth()]} {windowEnd.getFullYear()}
        </span>
        <button
          onClick={() => setOffset(o => o + 1)}
          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
        <button
          onClick={() => setOffset(0)}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
        >
          Heute
        </button>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4 flex-wrap">
          {Object.entries(teamColourMap).map(([name, colour]) => (
            <span key={name} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colour }} />
              {name}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-amber-500 text-sm">▼</span> Meilenstein
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-sm">🔨</span> Aufbau
          </span>
        </div>
      </div>

      {/* Gantt grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 600 }}>
          {/* Month headers */}
          <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '180px repeat(6, 1fr)' }}>
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-r border-slate-100" />
            {months.map((m, i) => (
              <div
                key={i}
                className={`py-2 text-center text-xs font-semibold text-slate-500 border-r border-slate-100 last:border-r-0 ${
                  m.getMonth() === new Date().getMonth() && m.getFullYear() === new Date().getFullYear()
                    ? 'bg-blue-50 text-blue-700'
                    : ''
                }`}
              >
                {MONTH_NAMES[m.getMonth()]} {m.getFullYear()}
              </div>
            ))}
          </div>

          {/* Project rows */}
          {sorted.length === 0 && (
            <div className="px-4 py-12 text-center text-slate-400 text-sm">
              Keine Projekte mit Datumsangaben.
            </div>
          )}
          {sorted.map((p) => {
            const colour = p.buildTeam ? (teamColourMap[p.buildTeam.name] ?? '#94a3b8') : '#94a3b8'
            const start = p.startDate ? new Date(p.startDate) : null
            const end = p.plannedEndDate ? new Date(p.plannedEndDate) : null

            const barLeft = start ? pct(start, windowStart, totalMs) : 0
            const barRight = end ? (100 - pct(end, windowStart, totalMs)) : 0
            const showBar = barLeft < 100 && barRight < 100

            const aufbau = p.milestones.find(m => m.type === 'aufbau')
            const regularMilestones = p.milestones.filter(m => m.type !== 'aufbau' && m.dueDate)

            return (
              <div
                key={p.id}
                className="grid border-b border-slate-50 hover:bg-slate-50 transition-colors"
                style={{ gridTemplateColumns: '180px repeat(6, 1fr)', minHeight: 52 }}
              >
                {/* Label */}
                <div className="px-3 py-2 border-r border-slate-100 flex flex-col justify-center">
                  <span className="text-xs font-semibold text-slate-900 leading-tight truncate">{p.name}</span>
                  {p.buildTeam && (
                    <span className="text-[0.65rem] font-semibold mt-0.5" style={{ color: colour }}>
                      {p.buildTeam.name}
                    </span>
                  )}
                </div>

                {/* Timeline area (spans all 6 columns) */}
                <div className="relative col-span-6" style={{ minHeight: 52 }}>
                  {/* Month separator lines */}
                  {months.slice(1).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-slate-100"
                      style={{ left: `${((i + 1) / 6) * 100}%` }}
                    />
                  ))}

                  {/* Today line */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-400 opacity-60 z-10"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}

                  {/* Main project bar */}
                  {showBar && (
                    <div
                      className="absolute top-3 rounded flex items-center px-1.5 overflow-hidden"
                      style={{
                        left: `${barLeft}%`,
                        right: `${Math.max(0, barRight)}%`,
                        height: 18,
                        background: colour,
                        opacity: 0.85,
                        minWidth: 4,
                      }}
                      title={`${p.name}: ${start?.toLocaleDateString('de-DE') ?? '?'} – ${end?.toLocaleDateString('de-DE') ?? '?'}`}
                    >
                      <span className="text-white text-[0.6rem] font-semibold truncate">{p.name}</span>
                    </div>
                  )}

                  {/* Aufbau bar */}
                  {aufbau?.dueDate && aufbau?.endDate && (() => {
                    const aufbauStart = new Date(aufbau.dueDate)
                    const aufbauEnd = new Date(aufbau.endDate)
                    const aLeft = pct(aufbauStart, windowStart, totalMs)
                    const aRight = 100 - pct(aufbauEnd, windowStart, totalMs)
                    if (aLeft >= 100 || aRight >= 100) return null
                    return (
                      <div
                        className="absolute rounded"
                        style={{
                          left: `${Math.max(0, aLeft)}%`,
                          right: `${Math.max(0, aRight)}%`,
                          top: 24,
                          height: 7,
                          background: colour,
                          filter: 'brightness(0.7)',
                          minWidth: 3,
                        }}
                        title={`🔨 Aufbau: ${aufbauStart.toLocaleDateString('de-DE')} – ${aufbauEnd.toLocaleDateString('de-DE')}`}
                      />
                    )
                  })()}

                  {/* Milestone markers */}
                  {regularMilestones.map(m => {
                    const mDate = new Date(m.dueDate!)
                    const mLeft = pct(mDate, windowStart, totalMs)
                    if (mLeft < 0 || mLeft > 100) return null
                    const isDone = !!m.completedAt
                    return (
                      <div
                        key={m.id}
                        className="absolute text-sm leading-none z-20 cursor-default"
                        style={{
                          left: `${mLeft}%`,
                          top: 4,
                          transform: 'translateX(-50%)',
                          color: isDone ? '#16a34a' : '#f59e0b',
                        }}
                        title={`${m.title}: ${mDate.toLocaleDateString('de-DE')}${isDone ? ' ✓' : ''}`}
                      >
                        ▼
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/jhj/scc-crm && npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Verify in browser**

Start dev server (`npm run dev`). Navigate to `/projects?view=kalender`. Verify:
- Tab shows "Kalender" (not "Auslastung")
- Gantt rows appear for projects with dates
- Navigation buttons move the 6-month window
- "Heute" resets to current window
- Bautrupp colours consistent

- [ ] **Step 4: Commit**

```bash
git add components/projects/ProjectGanttCalendar.tsx
git commit -m "feat: add Gantt calendar view replacing Auslastung tab"
```

---

### Task 5: Reklamationen an AFP

**Files:**
- Create: `lib/actions/reclamations.actions.ts`
- Create: `components/projects/ReclamationCard.tsx`
- Modify: `app/(app)/projects/[id]/page.tsx`

- [ ] **Step 1: Create reclamation server actions**

Create `lib/actions/reclamations.actions.ts`:

```typescript
'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { error?: string }

export async function addReclamation(
  projectId: string,
  input: { title: string; courtRef?: string; description?: string }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }
  if (!input.title.trim()) return { error: 'Titel erforderlich.' }

  const { error } = await supabase.from('project_reclamations').insert({
    id: randomUUID(),
    projectId,
    title: input.title.trim(),
    courtRef: input.courtRef?.trim() || null,
    description: input.description?.trim() || null,
    status: 'open',
    reportedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function updateReclamationStatus(
  id: string,
  projectId: string,
  status: 'open' | 'in_progress' | 'resolved'
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('project_reclamations')
    .update({
      status,
      resolvedAt: status === 'resolved' ? new Date().toISOString().slice(0, 10) : null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return {}
}

export async function deleteReclamation(id: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht autorisiert.' }

  const { error } = await supabase.from('project_reclamations').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return {}
}
```

- [ ] **Step 2: Create ReclamationCard component**

Create `components/projects/ReclamationCard.tsx`:

```tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addReclamation, updateReclamationStatus, deleteReclamation } from '@/lib/actions/reclamations.actions'

interface Reclamation {
  id: string
  title: string
  courtRef: string | null
  description: string | null
  status: 'open' | 'in_progress' | 'resolved'
  reportedAt: string
  resolvedAt: string | null
}

interface Props {
  projectId: string
  reclamations: Reclamation[]
}

const STATUS_LABEL = { open: 'Offen', in_progress: 'In Bearbeitung', resolved: 'Erledigt' }
const STATUS_BADGE = {
  open: 'bg-red-50 text-red-700 border border-red-200',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

export function ReclamationCard({ projectId, reclamations }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [courtRef, setCourtRef] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const openCount = reclamations.filter(r => r.status !== 'resolved').length

  function handleAdd() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addReclamation(projectId, { title, courtRef, description })
      if (result.error) { setError(result.error); return }
      setTitle(''); setCourtRef(''); setDescription(''); setShowForm(false)
      router.refresh()
    })
  }

  function handleStatusChange(id: string, status: 'open' | 'in_progress' | 'resolved') {
    startTransition(async () => {
      await updateReclamationStatus(id, projectId, status)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Reklamation wirklich löschen?')) return
    startTransition(async () => {
      await deleteReclamation(id, projectId)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100 bg-red-50/50">
        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-red-700">Reklamationen an AFP</h3>
        {openCount > 0 && (
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {openCount} offen
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowForm(s => !s)} className="ml-auto text-xs text-red-600 h-7">
          <Plus className="w-3.5 h-3.5 mr-1" /> Reklamation
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-red-100 bg-white space-y-2">
          <Input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titel der Reklamation *" className="text-sm"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={courtRef} onChange={e => setCourtRef(e.target.value)}
              placeholder="Court-Bezug (z.B. Court 2)" className="text-sm"
            />
            <Input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Kurzbeschreibung" className="text-sm"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>Hinzufügen</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setError(null) }}>Abbrechen</Button>
          </div>
        </div>
      )}

      {/* List */}
      {reclamations.length === 0 && !showForm && (
        <p className="px-4 py-6 text-sm text-slate-400 text-center">Keine Reklamationen.</p>
      )}
      {reclamations.map(r => {
        const isExpanded = expandedId === r.id
        const isResolved = r.status === 'resolved'
        return (
          <div key={r.id} className={`border-b border-slate-100 last:border-b-0 ${isResolved ? 'opacity-50' : ''}`}>
            <button
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  <span className={`text-sm font-medium text-slate-900 ${isResolved ? 'line-through' : ''}`}>
                    {r.title}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {r.courtRef && <span>{r.courtRef} · </span>}
                  Gemeldet {new Date(r.reportedAt).toLocaleDateString('de-DE')}
                  {r.resolvedAt && ` · Erledigt ${new Date(r.resolvedAt).toLocaleDateString('de-DE')}`}
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 space-y-3 bg-slate-50 border-t border-slate-100">
                {r.description && <p className="text-sm text-slate-600 pt-2">{r.description}</p>}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-slate-500 font-medium">Status:</span>
                  {(['open', 'in_progress', 'resolved'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(r.id, s)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        r.status === s ? STATUS_BADGE[s] + ' font-semibold' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="ml-auto text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Load reclamations in project detail page**

In `app/(app)/projects/[id]/page.tsx`, find the section where `materialItems` is loaded and add reclamations. Locate the `Promise.all` block that loads `milestonesRes`, `punchRes`, `materialRes` and add a fourth fetch:

```typescript
// Add this import at the top:
import { ReclamationCard } from '@/components/projects/ReclamationCard'

// In the Promise.all, add:
const [milestonesRes, punchRes, materialRes, reclamationsRes] = await Promise.all([
  supabase.from('project_milestones').select('*').eq('projectId', id)
    .order('sortOrder', { ascending: true }).order('createdAt', { ascending: true }),
  supabase.from('project_punch_items').select('*').eq('projectId', id)
    .order('sortOrder', { ascending: true }).order('createdAt', { ascending: true }),
  supabase.from('project_material_items').select('*').eq('projectId', id)
    .order('sortOrder', { ascending: true }).order('createdAt', { ascending: true }),
  supabase.from('project_reclamations').select('*').eq('projectId', id)
    .order('createdAt', { ascending: false }),
])
const reclamations = reclamationsRes.data ?? []
```

Then add the ReclamationCard after MaterialChecklistCard in the JSX:

```tsx
<MaterialChecklistCard projectId={id} items={project.materialItems ?? []} />
<ReclamationCard projectId={id} reclamations={reclamations} />
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/jhj/scc-crm && npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 5: Verify in browser**

Open any project detail page. Scroll to the Material section. The "Reklamationen an AFP" card appears below it. Add a reclamation, verify it appears. Change status. Delete.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/reclamations.actions.ts components/projects/ReclamationCard.tsx "app/(app)/projects/[id]/page.tsx"
git commit -m "feat: add Reklamationen an AFP module to project detail"
```

---

### Task 6: Abnahme — Foto-Bug-Fix

**Files:**
- Modify: `components/acceptance/AcceptanceItemSheet.tsx`

- [ ] **Step 1: Add localPhotos state for optimistic updates**

In `components/acceptance/AcceptanceItemSheet.tsx`, add a `localPhotos` state and update the upload handler and render logic:

```tsx
// Add to state declarations (after `const [error, setError] = useState<string | null>(null)`):
const [localPhotos, setLocalPhotos] = useState<Array<{ id: string; storagePath: string; filename: string; signedUrl: string }>>([])
```

Update `handlePhotoUpload` to append the photo optimistically after successful upload:

```tsx
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

    // Get signed URL for optimistic display
    const { data: signedData } = await supabase.storage
      .from('project-attachments')
      .createSignedUrl(storagePath, 3600)

    const result = await recordItemPhoto(item.id, projectId, storagePath, file.name)
    if (result.error) throw new Error(result.error)

    // Optimistic update — show immediately without page reload
    if (signedData?.signedUrl) {
      setLocalPhotos(prev => [...prev, {
        id: `local-${Date.now()}`,
        storagePath,
        filename: file.name,
        signedUrl: signedData.signedUrl,
      }])
    }
    router.refresh()
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
  } finally {
    setUploading(false)
  }
}
```

Update the photos render section to merge server photos with local photos:

```tsx
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

    {/* Optimistic local photos */}
    {localPhotos.map((photo) => (
      <div key={photo.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 ring-2 ring-blue-300">
        <img src={photo.signedUrl} alt={photo.filename} className="w-full h-full object-cover" />
      </div>
    ))}

    {/* Kamera-Button */}
    {/* ... unchanged ... */}
```

- [ ] **Step 2: Verify in browser**

Open a project, enter tablet mode, tap an item. Upload a photo. Verify it appears **immediately** without needing a manual page reload. The optimistic photo has a blue ring to distinguish it until the page re-syncs.

- [ ] **Step 3: Commit**

```bash
git add components/acceptance/AcceptanceItemSheet.tsx
git commit -m "fix: photos appear immediately after upload in AcceptanceItemSheet (optimistic update)"
```

---

### Task 7: Abnahme — Anlage/Position-Feld

**Files:**
- Modify: `lib/db/acceptance-protocol.ts`
- Modify: `lib/actions/acceptance-protocol.actions.ts`
- Modify: `components/acceptance/AcceptanceItemSheet.tsx`
- Modify: `components/acceptance/AcceptanceItemCard.tsx`

- [ ] **Step 1: Add position to the AcceptanceItem type**

In `lib/db/acceptance-protocol.ts`, add `position` to the `AcceptanceItem` interface:

```typescript
export interface AcceptanceItem {
  id: string
  phaseId: string
  title: string
  status: 'not_checked' | 'ok' | 'defect'
  priority: 'low' | 'medium' | 'critical' | null
  notes: string | null
  position: string | null   // <-- add this
  assigneeId: string | null
  buildTeamId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  photos: AcceptanceItemPhoto[]
  assignee: { id: string; firstName: string; lastName: string } | null
  buildTeam: { id: string; name: string } | null
}
```

- [ ] **Step 2: Add position to the select query**

In `lib/db/acceptance-protocol.ts`, find the select string for acceptance_items and add `position`:

```typescript
// Find the select for acceptance_items — it selects specific columns.
// Add "position" to the list. The select currently has:
//   id, phaseId, title, status, priority, notes, assigneeId, buildTeamId, sortOrder, createdAt, updatedAt
// Change to:
//   id, phaseId, title, status, priority, notes, position, assigneeId, buildTeamId, sortOrder, createdAt, updatedAt
```

- [ ] **Step 3: Add position to updateItem action**

In `lib/actions/acceptance-protocol.actions.ts`, find the `updateItem` function and add `position` to the update payload:

```typescript
// The updateItem function currently updates: status, priority, notes, assigneeId, buildTeamId
// Add position to the input type and the update call:

export async function updateItem(
  itemId: string,
  projectId: string,
  updates: {
    status: AcceptanceItem['status']
    priority: AcceptanceItem['priority']
    notes: string | null
    assigneeId: string | null
    buildTeamId: string | null
    position?: string | null   // <-- add
  }
): Promise<ActionResult> {
  // ... existing auth check ...
  const { error } = await supabase.from('acceptance_items')
    .update({
      status: updates.status,
      priority: updates.priority,
      notes: updates.notes,
      assigneeId: updates.assigneeId,
      buildTeamId: updates.buildTeamId,
      position: updates.position ?? null,   // <-- add
      updatedAt: new Date().toISOString(),
    })
    .eq('id', itemId)
  // ... existing error handling ...
}
```

- [ ] **Step 4: Add position field to AcceptanceItemSheet**

In `components/acceptance/AcceptanceItemSheet.tsx`:

Add to state declarations:
```tsx
const [position, setPosition] = useState(item.position ?? '')
```

Add `position` to the `handleSave` call:
```tsx
const result = await updateItem(item.id, projectId, {
  status: status as AcceptanceItem['status'],
  priority: (status === 'defect' && priority) ? priority as AcceptanceItem['priority'] : null,
  notes: notes || null,
  assigneeId: assigneeId || null,
  buildTeamId: buildTeamId || null,
  position: position || null,   // <-- add
})
```

Add the position input between the Status and Notiz sections in the JSX:
```tsx
{/* Anlage / Position */}
<div>
  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Anlage / Position</p>
  <input
    type="text"
    value={position}
    onChange={(e) => setPosition(e.target.value)}
    placeholder="z.B. Netzpfosten Nord, Ecke links, Feld 3…"
    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
```

- [ ] **Step 5: Show position in AcceptanceItemCard**

In `components/acceptance/AcceptanceItemCard.tsx`, show position as grey text when set:

```tsx
// After the title span, add:
{item.position && (
  <span className="text-xs text-slate-400 truncate ml-1">· {item.position}</span>
)}
```

- [ ] **Step 6: Verify build and functionality**

```bash
cd /Users/jhj/scc-crm && npm run build
```

Open a project in tablet mode. Tap an item. Enter a position like "Netzpfosten Nord". Save. The item card now shows "· Netzpfosten Nord" in grey.

- [ ] **Step 7: Commit**

```bash
git add lib/db/acceptance-protocol.ts lib/actions/acceptance-protocol.actions.ts components/acceptance/AcceptanceItemSheet.tsx components/acceptance/AcceptanceItemCard.tsx
git commit -m "feat: add Anlage/Position field to acceptance items"
```

---

### Task 8: Tablet-Modus Design (Grün)

**Files:**
- Modify: `components/acceptance/AcceptancePhasesTabs.tsx`

- [ ] **Step 1: Replace blue colour scheme with green**

In `components/acceptance/AcceptancePhasesTabs.tsx`, make these replacements throughout the file:

| Find | Replace |
|------|---------|
| `bg-blue-900` | `bg-[#036147]` |
| `text-blue-900` | `text-[#036147]` |
| `text-blue-300` | `text-emerald-200` |
| `text-blue-800` | `text-emerald-900` |
| `text-blue-400` | `text-emerald-300` |
| `bg-blue-600 text-white` (OK button) | `bg-[#036147] text-white` |

Also update the "Phase abschliessen" button. Find:
```tsx
className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
```
Replace with:
```tsx
className="flex-1 py-3 rounded-xl bg-white text-[#036147] text-sm font-semibold flex items-center justify-center gap-2 border-2 border-[#036147]"
```

- [ ] **Step 2: Verify in browser**

Enter tablet mode on any project with an Abnahmeprotokoll. Verify header is now dark green (#036147) instead of blue-900. Tabs are green. "Phase abschliessen" button is white with green border.

- [ ] **Step 3: Commit**

```bash
git add components/acceptance/AcceptancePhasesTabs.tsx
git commit -m "feat: update Abnahme tablet mode colour scheme to brand green #036147"
```

---

### Task 9: Abnahme — Desktop Inline-Editing

**Files:**
- Modify: `components/acceptance/AcceptanceDesktopOverview.tsx`

- [ ] **Step 1: Add inline editing to AcceptanceDesktopOverview**

Read the current file first, then replace the `PhaseCard` component to support `expandedItemId`. Add an `InlineItemEditor` sub-component. The key changes:

**Add imports:**
```tsx
import { useTransition, useState } from 'react'
import { updateItem } from '@/lib/actions/acceptance-protocol.actions'
import { createClient } from '@/lib/supabase/client'
import { recordItemPhoto } from '@/lib/actions/acceptance-protocol.actions'
```

**Add InlineItemEditor component** (insert before `PhaseCard`):

```tsx
function InlineItemEditor({
  item,
  projectId,
  teamMembers,
  buildTeams,
  onSaved,
}: {
  item: AcceptanceItem
  projectId: string
  teamMembers: { id: string; firstName: string; lastName: string }[]
  buildTeams: { id: string; name: string }[]
  onSaved: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState<AcceptanceItem['status']>(item.status)
  const [priority, setPriority] = useState(item.priority ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [position, setPosition] = useState(item.position ?? '')
  const [uploading, setUploading] = useState(false)
  const [localPhotos, setLocalPhotos] = useState<Array<{ id: string; signedUrl: string; filename: string; storagePath: string }>>([])
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    startTransition(async () => {
      const result = await updateItem(item.id, projectId, {
        status,
        priority: (status === 'defect' && priority) ? priority as AcceptanceItem['priority'] : null,
        notes: notes || null,
        assigneeId: item.assigneeId,
        buildTeamId: item.buildTeamId,
        position: position || null,
      })
      if (result.error) { setError(typeof result.error === 'string' ? result.error : 'Fehler'); return }
      router.refresh()
      onSaved()
    })
  }

  async function handlePhoto(file: File) {
    setUploading(true)
    try {
      const supabase = createClient()
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `acceptance/${projectId}/${item.id}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from('project-attachments')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type })
      if (upErr) throw upErr
      const { data: signedData } = await supabase.storage.from('project-attachments').createSignedUrl(storagePath, 3600)
      await recordItemPhoto(item.id, projectId, storagePath, file.name)
      if (signedData?.signedUrl) {
        setLocalPhotos(prev => [...prev, { id: `l-${Date.now()}`, storagePath, filename: file.name, signedUrl: signedData.signedUrl }])
      }
      router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen') }
    finally { setUploading(false) }
  }

  return (
    <div className="border-t border-[#036147]/20 pt-3 mt-1 space-y-3">
      {/* Status */}
      <div className="flex gap-2">
        {(['not_checked', 'ok', 'defect'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); if (s !== 'defect') setPriority('') }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
              status === s
                ? s === 'ok' ? 'bg-green-500 text-white border-green-500'
                : s === 'defect' ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {s === 'ok' ? 'OK' : s === 'defect' ? 'Mangel' : 'Offen'}
          </button>
        ))}
      </div>

      {/* Priority */}
      {status === 'defect' && (
        <div className="flex gap-2">
          {(['low', 'medium', 'critical'] as const).map((p) => (
            <button key={p} onClick={() => setPriority(p)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                priority === p
                  ? p === 'critical' ? 'bg-red-500 text-white border-red-500'
                  : p === 'medium' ? 'bg-orange-400 text-white border-orange-400'
                  : 'bg-yellow-400 text-slate-900 border-yellow-400'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {p === 'low' ? 'Leicht' : p === 'medium' ? 'Mittel' : 'Kritisch'}
            </button>
          ))}
        </div>
      )}

      {/* Position */}
      <input
        type="text"
        value={position}
        onChange={e => setPosition(e.target.value)}
        placeholder="Anlage / Position (z.B. Netzpfosten Nord)"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#036147]/40"
      />

      {/* Notes */}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notiz…"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs h-16 resize-none focus:outline-none focus:ring-2 focus:ring-[#036147]/40"
      />

      {/* Photos */}
      <div className="flex flex-wrap gap-2">
        {[...item.photos.map(ph => ({ id: ph.id, filename: ph.filename })), ...localPhotos].map((ph) => (
          <div key={ph.id} className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden">
            {'signedUrl' in ph ? (
              <img src={(ph as { signedUrl: string }).signedUrl} alt={ph.filename} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400">📷</span>
            )}
          </div>
        ))}
        <label className={`w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#036147] transition-colors text-xs text-slate-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          📷
          <span className="text-[0.6rem]">Foto</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.currentTarget.value = '' }} />
        </label>
        <label className={`w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#036147] transition-colors text-xs text-slate-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          🖼
          <span className="text-[0.6rem]">Datei</span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.currentTarget.value = '' }} />
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} className="bg-[#036147] hover:bg-[#025038] text-white flex-1">Speichern</Button>
        <Button size="sm" variant="ghost" onClick={onSaved}>Abbrechen</Button>
      </div>
    </div>
  )
}
```

**Update PhaseCard** to accept `teamMembers` and `buildTeams`, add `expandedItemId` state, and render `InlineItemEditor` for the expanded item:

Update `PhaseCard` signature:
```tsx
function PhaseCard({
  phase, projectId, onTabletMode,
  teamMembers, buildTeams,
}: {
  phase: AcceptancePhase
  projectId: string
  onTabletMode: (phaseId?: string) => void
  teamMembers: { id: string; firstName: string; lastName: string }[]
  buildTeams: { id: string; name: string }[]
}) {
```

Add inside `PhaseCard`:
```tsx
const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
```

Update item list rendering to add click-to-expand:
```tsx
{phase.items.map((item) => (
  <li key={item.id}>
    <button
      className="w-full text-left flex items-center gap-2 py-0.5 hover:text-slate-900 transition-colors"
      onClick={() => !isComplete && setExpandedItemId(id => id === item.id ? null : item.id)}
      disabled={isComplete}
    >
      {item.status === 'ok'
        ? <CheckCircle2 className="w-3.5 h-3.5 text-[#036147] flex-shrink-0" />
        : item.status === 'defect'
        ? <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
        : <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
      <span className={`text-xs flex-1 text-left ${item.status === 'ok' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
        {item.title}
      </span>
      {item.position && <span className="text-xs text-slate-400 truncate max-w-[100px]">{item.position}</span>}
      {item.status === 'defect' && item.priority && (
        <span className="text-xs text-orange-400">({PRIORITY_LABEL[item.priority]})</span>
      )}
      {item.photos.length > 0 && <span className="text-xs text-slate-300">📷{item.photos.length}</span>}
    </button>

    {expandedItemId === item.id && !isComplete && (
      <InlineItemEditor
        item={item}
        projectId={projectId}
        teamMembers={teamMembers}
        buildTeams={buildTeams}
        onSaved={() => setExpandedItemId(null)}
      />
    )}
  </li>
))}
```

**Update `AcceptanceDesktopOverview`** to pass `teamMembers` and `buildTeams` through:

Update the Props interface:
```tsx
interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  onTabletMode: (phaseId?: string) => void
  teamMembers: { id: string; firstName: string; lastName: string }[]
  buildTeams: { id: string; name: string }[]
}
```

Update PhaseCard usage:
```tsx
{protocol.phases.map((phase) => (
  <PhaseCard
    key={phase.id}
    phase={phase}
    projectId={projectId}
    onTabletMode={onTabletMode}
    teamMembers={teamMembers}
    buildTeams={buildTeams}
  />
))}
```

**Update `ProtocolModeWrapper`** to pass `teamMembers` and `buildTeams` to `AcceptanceDesktopOverview`:
```tsx
return (
  <AcceptanceDesktopOverview
    protocol={protocol}
    projectId={projectId}
    teamMembers={teamMembers}
    buildTeams={buildTeams}
    onTabletMode={(phaseId?: string) => { setInitialPhaseId(phaseId); setTabletMode(true) }}
  />
)
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/jhj/scc-crm && npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open a project → click "Abnahmeprotokoll" → the drawer opens. Click any item in the phase card (that is not completed). It expands inline showing status buttons, position field, notes, photo upload. Change status to "Mangel", enter a position, save. Item card updates immediately.

- [ ] **Step 4: Commit**

```bash
git add components/acceptance/AcceptanceDesktopOverview.tsx components/acceptance/ProtocolModeWrapper.tsx
git commit -m "feat: add inline editing to Abnahme desktop drawer"
```

---

## Final Check

- [ ] Run full build: `cd /Users/jhj/scc-crm && npm run build` — zero errors
- [ ] Navigate to `/projects` — new columns visible, toggle works, completed projects hidden by default
- [ ] Navigate to `/projects?view=kalender` — Gantt renders, navigation works, today line visible
- [ ] Open a project detail — Reklamationen card visible below Material
- [ ] Open Abnahmeprotokoll drawer — inline editing works
- [ ] Enter tablet mode — green header instead of blue
- [ ] Upload photo in tablet mode — appears immediately without reload
