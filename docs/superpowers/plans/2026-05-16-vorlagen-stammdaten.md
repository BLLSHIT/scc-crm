# Vorlagen & Stammdaten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verwaltbare Vorlagen für Meilensteine, Punch List und Material unter Stammdaten, importierbar in Projekte als Set oder einzeln.

**Architecture:** Sechs neue DB-Tabellen (drei Template-Typen + ihre Items + Sets). Stammdaten-Seiten folgen dem Text-Modules-Muster (Server Component Übersicht + Client Component Detail). Import-Modal als eigenständiger Client Component, der Optionen via Server Action lädt.

**Tech Stack:** Next.js 15 App Router, Supabase JS Client, Zod, Tailwind CSS, dnd-kit (bereits installiert), lucide-react

---

### Task 1: DB Migration

**Files:**
- Create: `prisma/migrations/manual-vorlagen.sql`

- [ ] **Step 1: Create the SQL migration file**

```sql
-- prisma/migrations/manual-vorlagen.sql

-- Meilenstein-Vorlagen
CREATE TABLE IF NOT EXISTS public.milestone_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all milestone_templates"
  ON public.milestone_templates FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.milestone_template_items (
  id TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL REFERENCES public.milestone_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_milestone_template_items_template
  ON public.milestone_template_items("templateId", "sortOrder");
ALTER TABLE public.milestone_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all milestone_template_items"
  ON public.milestone_template_items FOR ALL USING (auth.role() = 'authenticated');

-- Checklisten-Vorlagen (Punch List)
CREATE TABLE IF NOT EXISTS public.punchlist_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.punchlist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all punchlist_templates"
  ON public.punchlist_templates FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.punchlist_template_items (
  id TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL REFERENCES public.punchlist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_punchlist_template_items_template
  ON public.punchlist_template_items("templateId", "sortOrder");
ALTER TABLE public.punchlist_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all punchlist_template_items"
  ON public.punchlist_template_items FOR ALL USING (auth.role() = 'authenticated');

-- Material-Vorlagen
CREATE TABLE IF NOT EXISTS public.material_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.material_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all material_templates"
  ON public.material_templates FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.material_template_items (
  id TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL REFERENCES public.material_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  notes TEXT,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_template_items_template
  ON public.material_template_items("templateId", "sortOrder");
ALTER TABLE public.material_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all material_template_items"
  ON public.material_template_items FOR ALL USING (auth.role() = 'authenticated');

-- Vorlagen-Sets
CREATE TABLE IF NOT EXISTS public.template_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "milestoneTemplateId" TEXT REFERENCES public.milestone_templates(id) ON DELETE SET NULL,
  "punchlistTemplateId" TEXT REFERENCES public.punchlist_templates(id) ON DELETE SET NULL,
  "materialTemplateId"  TEXT REFERENCES public.material_templates(id)  ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.template_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all template_sets"
  ON public.template_sets FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Run in Supabase SQL Editor**

Open Supabase → SQL Editor → New query → paste the file contents → Run.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify tables exist**

In Supabase → Table Editor, confirm these 7 tables appear:
`milestone_templates`, `milestone_template_items`, `punchlist_templates`, `punchlist_template_items`, `material_templates`, `material_template_items`, `template_sets`

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/manual-vorlagen.sql
git commit -m "feat: add DB migration for template system"
```

---

### Task 2: DB Query Layer

**Files:**
- Create: `lib/db/templates.ts`

- [ ] **Step 1: Create lib/db/templates.ts**

```typescript
import { createClient } from '@/lib/supabase/server'

export interface MilestoneTemplateItem {
  id: string
  templateId: string
  title: string
  description: string | null
  sortOrder: number
}

export interface MilestoneTemplate {
  id: string
  name: string
  description: string | null
  items: MilestoneTemplateItem[]
}

export interface PunchlistTemplateItem {
  id: string
  templateId: string
  title: string
  sortOrder: number
}

export interface PunchlistTemplate {
  id: string
  name: string
  description: string | null
  items: PunchlistTemplateItem[]
}

export interface MaterialTemplateItem {
  id: string
  templateId: string
  title: string
  quantity: number | null
  unit: string | null
  notes: string | null
  sortOrder: number
}

export interface MaterialTemplate {
  id: string
  name: string
  description: string | null
  items: MaterialTemplateItem[]
}

export interface TemplateSet {
  id: string
  name: string
  description: string | null
  milestoneTemplateId: string | null
  punchlistTemplateId: string | null
  materialTemplateId: string | null
  milestoneTemplate: { id: string; name: string } | null
  punchlistTemplate: { id: string; name: string } | null
  materialTemplate: { id: string; name: string } | null
}

export interface TemplateOptions {
  milestones: { id: string; name: string }[]
  punchlists: { id: string; name: string }[]
  materials: { id: string; name: string }[]
  sets: { id: string; name: string }[]
}

export async function getMilestoneTemplates(): Promise<MilestoneTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('milestone_templates')
    .select('id, name, description, items:milestone_template_items(id, templateId, title, description, sortOrder)')
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((t) => ({
    ...t,
    items: ((t.items as MilestoneTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

export async function getMilestoneTemplateById(id: string): Promise<MilestoneTemplate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('milestone_templates')
    .select('id, name, description, items:milestone_template_items(id, templateId, title, description, sortOrder)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    items: ((data.items as MilestoneTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

export async function getPunchlistTemplates(): Promise<PunchlistTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('punchlist_templates')
    .select('id, name, description, items:punchlist_template_items(id, templateId, title, sortOrder)')
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((t) => ({
    ...t,
    items: ((t.items as PunchlistTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

export async function getPunchlistTemplateById(id: string): Promise<PunchlistTemplate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('punchlist_templates')
    .select('id, name, description, items:punchlist_template_items(id, templateId, title, sortOrder)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    items: ((data.items as PunchlistTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

export async function getMaterialTemplates(): Promise<MaterialTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('material_templates')
    .select('id, name, description, items:material_template_items(id, templateId, title, quantity, unit, notes, sortOrder)')
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((t) => ({
    ...t,
    items: ((t.items as MaterialTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

export async function getMaterialTemplateById(id: string): Promise<MaterialTemplate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('material_templates')
    .select('id, name, description, items:material_template_items(id, templateId, title, quantity, unit, notes, sortOrder)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    items: ((data.items as MaterialTemplateItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

export async function getTemplateSets(): Promise<TemplateSet[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('template_sets')
    .select(`id, name, description, milestoneTemplateId, punchlistTemplateId, materialTemplateId,
      milestoneTemplate:milestone_templates(id, name),
      punchlistTemplate:punchlist_templates(id, name),
      materialTemplate:material_templates(id, name)`)
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any
}

export async function getTemplateOptions(): Promise<TemplateOptions> {
  const supabase = await createClient()
  const [mRes, pRes, matRes, sRes] = await Promise.all([
    supabase.from('milestone_templates').select('id, name').order('name'),
    supabase.from('punchlist_templates').select('id, name').order('name'),
    supabase.from('material_templates').select('id, name').order('name'),
    supabase.from('template_sets').select('id, name').order('name'),
  ])
  return {
    milestones: mRes.data ?? [],
    punchlists: pRes.data ?? [],
    materials: matRes.data ?? [],
    sets: sRes.data ?? [],
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add lib/db/templates.ts
git commit -m "feat: add templates DB query layer"
```

---

### Task 3: Validation Schema + Server Actions

**Files:**
- Create: `lib/validations/template.schema.ts`
- Create: `lib/actions/templates.actions.ts`

- [ ] **Step 1: Create lib/validations/template.schema.ts**

```typescript
import { z } from 'zod'

export const templateNameSchema = z.object({
  name: z.string().min(1, 'Name erforderlich').max(100),
  description: z.string().max(300).optional(),
})
export type TemplateNameInput = z.infer<typeof templateNameSchema>

export const milestoneTemplateItemSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich').max(200),
  description: z.string().max(500).optional(),
})
export type MilestoneTemplateItemInput = z.infer<typeof milestoneTemplateItemSchema>

export const punchlistTemplateItemSchema = z.object({
  title: z.string().min(1, 'Titel erforderlich').max(200),
})
export type PunchlistTemplateItemInput = z.infer<typeof punchlistTemplateItemSchema>

export const materialTemplateItemSchema = z.object({
  title: z.string().min(1, 'Bezeichnung erforderlich').max(200),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().max(20).optional(),
  notes: z.string().max(300).optional(),
})
export type MaterialTemplateItemInput = z.infer<typeof materialTemplateItemSchema>

export const templateSetSchema = z.object({
  name: z.string().min(1, 'Name erforderlich').max(100),
  description: z.string().max(300).optional(),
  milestoneTemplateId: z.string().optional(),
  punchlistTemplateId: z.string().optional(),
  materialTemplateId: z.string().optional(),
})
export type TemplateSetInput = z.infer<typeof templateSetSchema>

export const importTemplateSchema = z.object({
  milestoneTemplateId: z.string().optional(),
  punchlistTemplateId: z.string().optional(),
  materialTemplateId: z.string().optional(),
  mode: z.enum(['replace', 'append']),
})
export type ImportTemplateInput = z.infer<typeof importTemplateSchema>
```

- [ ] **Step 2: Create lib/actions/templates.actions.ts**

```typescript
'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTemplateOptions } from '@/lib/db/templates'
import {
  templateNameSchema, milestoneTemplateItemSchema, punchlistTemplateItemSchema,
  materialTemplateItemSchema, templateSetSchema, importTemplateSchema,
  type TemplateNameInput, type MilestoneTemplateItemInput, type PunchlistTemplateItemInput,
  type MaterialTemplateItemInput, type TemplateSetInput, type ImportTemplateInput,
} from '@/lib/validations/template.schema'

export type ActionResult = { error?: Record<string, string[]>; redirectTo?: string }

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// ─── Meilenstein-Vorlagen ─────────────────────────────────────────────────────

export async function createMilestoneTemplate(input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const id = randomUUID()
  const { error } = await supabase.from('milestone_templates').insert({
    id, name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/meilenstein-vorlagen')
  return { redirectTo: `/stammdaten/meilenstein-vorlagen/${id}` }
}

export async function updateMilestoneTemplate(id: string, input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('milestone_templates').update({
    name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/meilenstein-vorlagen')
  revalidatePath(`/stammdaten/meilenstein-vorlagen/${id}`)
  return {}
}

export async function deleteMilestoneTemplate(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('milestone_templates').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/meilenstein-vorlagen')
  return { redirectTo: '/stammdaten/meilenstein-vorlagen' }
}

export async function addMilestoneTemplateItem(templateId: string, input: MilestoneTemplateItemInput): Promise<ActionResult> {
  const parsed = milestoneTemplateItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: existing } = await supabase
    .from('milestone_template_items').select('sortOrder').eq('templateId', templateId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1
  const { error } = await supabase.from('milestone_template_items').insert({
    id: randomUUID(), templateId,
    title: parsed.data.title.trim(),
    description: parsed.data.description?.trim() || null,
    sortOrder: nextSort,
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/meilenstein-vorlagen/${templateId}`)
  return {}
}

export async function deleteMilestoneTemplateItem(itemId: string, templateId: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('milestone_template_items').delete().eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/meilenstein-vorlagen/${templateId}`)
  return {}
}

// ─── Checklisten-Vorlagen ─────────────────────────────────────────────────────

export async function createPunchlistTemplate(input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const id = randomUUID()
  const { error } = await supabase.from('punchlist_templates').insert({
    id, name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/checklisten-vorlagen')
  return { redirectTo: `/stammdaten/checklisten-vorlagen/${id}` }
}

export async function updatePunchlistTemplate(id: string, input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('punchlist_templates').update({
    name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/checklisten-vorlagen')
  revalidatePath(`/stammdaten/checklisten-vorlagen/${id}`)
  return {}
}

export async function deletePunchlistTemplate(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('punchlist_templates').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/checklisten-vorlagen')
  return { redirectTo: '/stammdaten/checklisten-vorlagen' }
}

export async function addPunchlistTemplateItem(templateId: string, input: PunchlistTemplateItemInput): Promise<ActionResult> {
  const parsed = punchlistTemplateItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: existing } = await supabase
    .from('punchlist_template_items').select('sortOrder').eq('templateId', templateId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1
  const { error } = await supabase.from('punchlist_template_items').insert({
    id: randomUUID(), templateId, title: parsed.data.title.trim(), sortOrder: nextSort,
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/checklisten-vorlagen/${templateId}`)
  return {}
}

export async function deletePunchlistTemplateItem(itemId: string, templateId: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('punchlist_template_items').delete().eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/checklisten-vorlagen/${templateId}`)
  return {}
}

// ─── Material-Vorlagen ────────────────────────────────────────────────────────

export async function createMaterialTemplate(input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const id = randomUUID()
  const { error } = await supabase.from('material_templates').insert({
    id, name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/material-vorlagen')
  return { redirectTo: `/stammdaten/material-vorlagen/${id}` }
}

export async function updateMaterialTemplate(id: string, input: TemplateNameInput): Promise<ActionResult> {
  const parsed = templateNameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('material_templates').update({
    name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/material-vorlagen')
  revalidatePath(`/stammdaten/material-vorlagen/${id}`)
  return {}
}

export async function deleteMaterialTemplate(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('material_templates').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/material-vorlagen')
  return { redirectTo: '/stammdaten/material-vorlagen' }
}

export async function addMaterialTemplateItem(templateId: string, input: MaterialTemplateItemInput): Promise<ActionResult> {
  const parsed = materialTemplateItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { data: existing } = await supabase
    .from('material_template_items').select('sortOrder').eq('templateId', templateId)
    .order('sortOrder', { ascending: false }).limit(1)
  const nextSort = (existing?.[0]?.sortOrder ?? -1) + 1
  const { error } = await supabase.from('material_template_items').insert({
    id: randomUUID(), templateId,
    title: parsed.data.title.trim(),
    quantity: parsed.data.quantity ?? null,
    unit: parsed.data.unit?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
    sortOrder: nextSort,
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/material-vorlagen/${templateId}`)
  return {}
}

export async function deleteMaterialTemplateItem(itemId: string, templateId: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('material_template_items').delete().eq('id', itemId)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(`/stammdaten/material-vorlagen/${templateId}`)
  return {}
}

// ─── Vorlagen-Sets ────────────────────────────────────────────────────────────

export async function createTemplateSet(input: TemplateSetInput): Promise<ActionResult> {
  const parsed = templateSetSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('template_sets').insert({
    id: randomUUID(),
    name: parsed.data.name.trim(),
    description: parsed.data.description?.trim() || null,
    milestoneTemplateId: parsed.data.milestoneTemplateId || null,
    punchlistTemplateId: parsed.data.punchlistTemplateId || null,
    materialTemplateId: parsed.data.materialTemplateId || null,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/vorlagen-sets')
  return {}
}

export async function updateTemplateSet(id: string, input: TemplateSetInput): Promise<ActionResult> {
  const parsed = templateSetSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('template_sets').update({
    name: parsed.data.name.trim(),
    description: parsed.data.description?.trim() || null,
    milestoneTemplateId: parsed.data.milestoneTemplateId || null,
    punchlistTemplateId: parsed.data.punchlistTemplateId || null,
    materialTemplateId: parsed.data.materialTemplateId || null,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/vorlagen-sets')
  return {}
}

export async function deleteTemplateSet(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }
  const { error } = await supabase.from('template_sets').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/stammdaten/vorlagen-sets')
  return {}
}

// ─── Template Options (für Import-Modal) ──────────────────────────────────────

export async function fetchTemplateOptions() {
  const { user } = await getUser()
  if (!user) return null
  return getTemplateOptions()
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importTemplate(projectId: string, input: ImportTemplateInput): Promise<ActionResult> {
  const parsed = importTemplateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }

  const { milestoneTemplateId, punchlistTemplateId, materialTemplateId, mode } = parsed.data

  async function getNextSort(table: string): Promise<number> {
    const { data } = await supabase
      .from(table).select('sortOrder').eq('projectId', projectId)
      .order('sortOrder', { ascending: false }).limit(1)
    return (data?.[0]?.sortOrder ?? -1) + 1
  }

  if (milestoneTemplateId) {
    if (mode === 'replace') {
      await supabase.from('project_milestones').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('milestone_template_items').select('title, description, sortOrder')
      .eq('templateId', milestoneTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = mode === 'append' ? await getNextSort('project_milestones') : 0
      await supabase.from('project_milestones').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId,
          title: item.title, description: item.description || null,
          sortOrder: offset + idx,
          updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  if (punchlistTemplateId) {
    if (mode === 'replace') {
      await supabase.from('project_punch_items').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('punchlist_template_items').select('title, sortOrder')
      .eq('templateId', punchlistTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = mode === 'append' ? await getNextSort('project_punch_items') : 0
      await supabase.from('project_punch_items').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId,
          title: item.title,
          sortOrder: offset + idx,
          updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  if (materialTemplateId) {
    if (mode === 'replace') {
      await supabase.from('project_material_items').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('material_template_items').select('title, quantity, unit, notes, sortOrder')
      .eq('templateId', materialTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = mode === 'append' ? await getNextSort('project_material_items') : 0
      await supabase.from('project_material_items').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId,
          title: item.title,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          notes: item.notes ?? null,
          sortOrder: offset + idx,
          updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return {}
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add lib/validations/template.schema.ts lib/actions/templates.actions.ts
git commit -m "feat: add template validation schemas and server actions"
```

---

### Task 4: Sidebar Navigation + Route Stubs

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Create: `app/(app)/stammdaten/meilenstein-vorlagen/page.tsx`
- Create: `app/(app)/stammdaten/checklisten-vorlagen/page.tsx`
- Create: `app/(app)/stammdaten/material-vorlagen/page.tsx`
- Create: `app/(app)/stammdaten/vorlagen-sets/page.tsx`

- [ ] **Step 1: Add icons to Sidebar.tsx import**

In `components/layout/Sidebar.tsx`, add `ListChecks, ClipboardList, Boxes, Layers` to the lucide-react import:

```typescript
import {
  LayoutDashboard, Users, Building2, TrendingUp, FolderKanban, FileText,
  Receipt, CheckSquare, Package, Tags, AlignLeft, UserCog, Briefcase,
  Megaphone, Database, HardHat, Settings, ShieldCheck, ChevronDown,
  ChevronRight, LogOut, Zap,
  ListChecks, ClipboardList, Boxes, Layers,
} from 'lucide-react'
```

- [ ] **Step 2: Add 4 nav items to the Stammdaten section**

Find the Stammdaten section (around line 62) and add four new items after `{ label: 'Bautrupp', href: '/build-teams', icon: HardHat }`:

```typescript
{ label: 'Meilenstein-Vorlagen', href: '/stammdaten/meilenstein-vorlagen', icon: ListChecks },
{ label: 'Checklisten-Vorlagen', href: '/stammdaten/checklisten-vorlagen', icon: ClipboardList },
{ label: 'Material-Vorlagen',    href: '/stammdaten/material-vorlagen',    icon: Boxes },
{ label: 'Vorlagen-Sets',        href: '/stammdaten/vorlagen-sets',        icon: Layers },
```

- [ ] **Step 3: Create stub pages**

`app/(app)/stammdaten/meilenstein-vorlagen/page.tsx`:
```typescript
export default function Page() {
  return <div className="flex-1 p-6 text-slate-500">Meilenstein-Vorlagen – coming soon</div>
}
```

Create the same stub content for:
- `app/(app)/stammdaten/checklisten-vorlagen/page.tsx`
- `app/(app)/stammdaten/material-vorlagen/page.tsx`
- `app/(app)/stammdaten/vorlagen-sets/page.tsx`

- [ ] **Step 4: Verify build and nav links appear**

```bash
npm run build
```
Expected: `✓ Compiled successfully` with 4 new routes in the static page list.

- [ ] **Step 5: Commit**

```bash
git add components/layout/Sidebar.tsx app/\(app\)/stammdaten/
git commit -m "feat: add Stammdaten nav items and route stubs for template pages"
```

---

### Task 5: Meilenstein-Vorlagen Pages

**Files:**
- Modify: `app/(app)/stammdaten/meilenstein-vorlagen/page.tsx`
- Create: `app/(app)/stammdaten/meilenstein-vorlagen/[id]/page.tsx`
- Create: `components/templates/MilestoneTemplateDetail.tsx`

- [ ] **Step 1: Write overview page**

Replace `app/(app)/stammdaten/meilenstein-vorlagen/page.tsx`:

```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMilestoneTemplates } from '@/lib/db/templates'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { Plus, ListChecks } from 'lucide-react'
import type { Profile } from '@/types/app.types'

export default async function MilestoneTemplatesPage() {
  let profile: Profile | null = null
  let templates: Awaited<ReturnType<typeof getMilestoneTemplates>> = []
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile
    templates = await getMilestoneTemplates()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Meilenstein-Vorlagen" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Meilenstein-Vorlagen (${templates.length})`}
        profile={profile}
        actions={
          <Link
            href="/stammdaten/meilenstein-vorlagen/neu"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Neue Vorlage
          </Link>
        }
      />
      <main className="p-6">
        {templates.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Noch keine Meilenstein-Vorlagen.</p>
            <Link href="/stammdaten/meilenstein-vorlagen/neu" className="mt-2 inline-block text-blue-600 hover:underline text-sm">
              Erste Vorlage anlegen
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/stammdaten/meilenstein-vorlagen/${t.id}`}
                className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
                <p className="text-xs text-slate-400 mt-2">{t.items.length} Einträge</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create the new-template page**

Create `app/(app)/stammdaten/meilenstein-vorlagen/neu/page.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createMilestoneTemplate } from '@/lib/actions/templates.actions'

export default function NewMilestoneTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createMilestoneTemplate({ name, description })
      if (result.error) { setError(result.error._form?.[0] ?? result.error.name?.[0] ?? 'Fehler.'); return }
      if (result.redirectTo) router.push(result.redirectTo)
    })
  }

  return (
    <div className="flex-1 p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Neue Meilenstein-Vorlage</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Standard Padel Court" autoFocus required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={description} onChange={(e) => setDescription(e.target.value)}
            rows={2} placeholder="Optional"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            Erstellen
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border text-sm rounded-lg hover:bg-slate-50">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create the detail client component**

Create `components/templates/MilestoneTemplateDetail.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import {
  updateMilestoneTemplate, deleteMilestoneTemplate,
  addMilestoneTemplateItem, deleteMilestoneTemplateItem,
} from '@/lib/actions/templates.actions'
import type { MilestoneTemplate } from '@/lib/db/templates'

export function MilestoneTemplateDetail({ template }: { template: MilestoneTemplate }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [editingHeader, setEditingHeader] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSaveHeader() {
    startTransition(async () => {
      const result = await updateMilestoneTemplate(template.id, { name, description })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setEditingHeader(false)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm(`Vorlage „${template.name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deleteMilestoneTemplate(template.id)
      router.push('/stammdaten/meilenstein-vorlagen')
    })
  }

  function handleAddItem() {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const result = await addMilestoneTemplateItem(template.id, { title: newTitle, description: newDesc })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setNewTitle(''); setNewDesc('')
      router.refresh()
    })
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      await deleteMilestoneTemplateItem(itemId, template.id)
      router.refresh()
    })
  }

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        {editingHeader ? (
          <div className="flex-1 space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
              value={name} onChange={(e) => setName(e.target.value)} autoFocus
            />
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            />
            <div className="flex gap-2">
              <button onClick={handleSaveHeader} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Speichern</button>
              <button onClick={() => setEditingHeader(false)} className="px-3 py-1.5 border text-sm rounded-lg">Abbrechen</button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{template.name}</h1>
            {template.description && <p className="text-sm text-slate-500 mt-1">{template.description}</p>}
            <button onClick={() => setEditingHeader(true)} className="text-xs text-blue-600 hover:underline mt-1">Bearbeiten</button>
          </div>
        )}
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 p-1" title="Vorlage löschen">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Item List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-medium text-slate-600">
          Einträge ({template.items.length})
        </div>
        {template.items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">Noch keine Einträge.</p>
        ) : (
          <ul className="divide-y">
            {template.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{item.title}</p>
                  {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add item form */}
        <div className="px-4 py-3 border-t bg-slate-50 space-y-2">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Neuer Eintrag (Titel)"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem() } }}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Beschreibung (optional)"
          />
          <button
            onClick={handleAddItem}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Eintrag hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create the detail server page**

Create `app/(app)/stammdaten/meilenstein-vorlagen/[id]/page.tsx`:

```typescript
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMilestoneTemplateById } from '@/lib/db/templates'
import { MilestoneTemplateDetail } from '@/components/templates/MilestoneTemplateDetail'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function MilestoneTemplateDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth" err={err} />
  }

  const template = await getMilestoneTemplateById(id)
  if (!template) notFound()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Meilenstein-Vorlage" profile={profile} />
      <MilestoneTemplateDetail template={template} />
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/stammdaten/meilenstein-vorlagen/ components/templates/MilestoneTemplateDetail.tsx
git commit -m "feat: add Meilenstein-Vorlagen pages (overview + detail)"
```

---

### Task 6: Checklisten-Vorlagen Pages

**Files:**
- Modify: `app/(app)/stammdaten/checklisten-vorlagen/page.tsx`
- Create: `app/(app)/stammdaten/checklisten-vorlagen/neu/page.tsx`
- Create: `app/(app)/stammdaten/checklisten-vorlagen/[id]/page.tsx`
- Create: `components/templates/PunchlistTemplateDetail.tsx`

- [ ] **Step 1: Write overview page**

Replace `app/(app)/stammdaten/checklisten-vorlagen/page.tsx`:

```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPunchlistTemplates } from '@/lib/db/templates'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { Plus, ClipboardList } from 'lucide-react'
import type { Profile } from '@/types/app.types'

export default async function PunchlistTemplatesPage() {
  let profile: Profile | null = null
  let templates: Awaited<ReturnType<typeof getPunchlistTemplates>> = []
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile
    templates = await getPunchlistTemplates()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Checklisten-Vorlagen" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Checklisten-Vorlagen (${templates.length})`}
        profile={profile}
        actions={
          <Link
            href="/stammdaten/checklisten-vorlagen/neu"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Neue Vorlage
          </Link>
        }
      />
      <main className="p-6">
        {templates.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Noch keine Checklisten-Vorlagen.</p>
            <Link href="/stammdaten/checklisten-vorlagen/neu" className="mt-2 inline-block text-blue-600 hover:underline text-sm">
              Erste Vorlage anlegen
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/stammdaten/checklisten-vorlagen/${t.id}`}
                className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
                <p className="text-xs text-slate-400 mt-2">{t.items.length} Einträge</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create new-template page**

Create `app/(app)/stammdaten/checklisten-vorlagen/neu/page.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPunchlistTemplate } from '@/lib/actions/templates.actions'

export default function NewPunchlistTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createPunchlistTemplate({ name, description })
      if (result.error) { setError(result.error._form?.[0] ?? result.error.name?.[0] ?? 'Fehler.'); return }
      if (result.redirectTo) router.push(result.redirectTo)
    })
  }

  return (
    <div className="flex-1 p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Neue Checklisten-Vorlage</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="z.B. Standard Abnahme" autoFocus required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Erstellen</button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border text-sm rounded-lg hover:bg-slate-50">Abbrechen</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create detail client component**

Create `components/templates/PunchlistTemplateDetail.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import {
  updatePunchlistTemplate, deletePunchlistTemplate,
  addPunchlistTemplateItem, deletePunchlistTemplateItem,
} from '@/lib/actions/templates.actions'
import type { PunchlistTemplate } from '@/lib/db/templates'

export function PunchlistTemplateDetail({ template }: { template: PunchlistTemplate }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [editingHeader, setEditingHeader] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSaveHeader() {
    startTransition(async () => {
      const result = await updatePunchlistTemplate(template.id, { name, description })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setEditingHeader(false); router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm(`Vorlage „${template.name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deletePunchlistTemplate(template.id)
      router.push('/stammdaten/checklisten-vorlagen')
    })
  }

  function handleAddItem() {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const result = await addPunchlistTemplateItem(template.id, { title: newTitle })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setNewTitle(''); router.refresh()
    })
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      await deletePunchlistTemplateItem(itemId, template.id)
      router.refresh()
    })
  }

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        {editingHeader ? (
          <div className="flex-1 space-y-2">
            <input className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
              value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm"
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <button onClick={handleSaveHeader} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Speichern</button>
              <button onClick={() => setEditingHeader(false)} className="px-3 py-1.5 border text-sm rounded-lg">Abbrechen</button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{template.name}</h1>
            {template.description && <p className="text-sm text-slate-500 mt-1">{template.description}</p>}
            <button onClick={() => setEditingHeader(true)} className="text-xs text-blue-600 hover:underline mt-1">Bearbeiten</button>
          </div>
        )}
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-medium text-slate-600">
          Einträge ({template.items.length})
        </div>
        {template.items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">Noch keine Einträge.</p>
        ) : (
          <ul className="divide-y">
            {template.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-slate-50">
                <p className="flex-1 text-sm text-slate-900">{item.title}</p>
                <button onClick={() => handleDeleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="px-4 py-3 border-t bg-slate-50">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)} placeholder="Neuer Eintrag"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem() } }} />
          <button onClick={handleAddItem}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /> Eintrag hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create detail server page**

Create `app/(app)/stammdaten/checklisten-vorlagen/[id]/page.tsx`:

```typescript
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPunchlistTemplateById } from '@/lib/db/templates'
import { PunchlistTemplateDetail } from '@/components/templates/PunchlistTemplateDetail'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function PunchlistTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth" err={err} />
  }
  const template = await getPunchlistTemplateById(id)
  if (!template) notFound()
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Checklisten-Vorlage" profile={profile} />
      <PunchlistTemplateDetail template={template} />
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/stammdaten/checklisten-vorlagen/ components/templates/PunchlistTemplateDetail.tsx
git commit -m "feat: add Checklisten-Vorlagen pages (overview + detail)"
```

---

### Task 7: Material-Vorlagen Pages

**Files:**
- Modify: `app/(app)/stammdaten/material-vorlagen/page.tsx`
- Create: `app/(app)/stammdaten/material-vorlagen/neu/page.tsx`
- Create: `app/(app)/stammdaten/material-vorlagen/[id]/page.tsx`
- Create: `components/templates/MaterialTemplateDetail.tsx`

- [ ] **Step 1: Write overview page**

Replace `app/(app)/stammdaten/material-vorlagen/page.tsx`:

```typescript
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMaterialTemplates } from '@/lib/db/templates'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { Plus, Boxes } from 'lucide-react'
import type { Profile } from '@/types/app.types'

export default async function MaterialTemplatesPage() {
  let profile: Profile | null = null
  let templates: Awaited<ReturnType<typeof getMaterialTemplates>> = []
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile
    templates = await getMaterialTemplates()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Material-Vorlagen" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Material-Vorlagen (${templates.length})`}
        profile={profile}
        actions={
          <Link href="/stammdaten/material-vorlagen/neu"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Neue Vorlage
          </Link>
        }
      />
      <main className="p-6">
        {templates.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Boxes className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Noch keine Material-Vorlagen.</p>
            <Link href="/stammdaten/material-vorlagen/neu" className="mt-2 inline-block text-blue-600 hover:underline text-sm">
              Erste Vorlage anlegen
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Link key={t.id} href={`/stammdaten/material-vorlagen/${t.id}`}
                className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
                <p className="text-xs text-slate-400 mt-2">{t.items.length} Einträge</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create new-template page**

Create `app/(app)/stammdaten/material-vorlagen/neu/page.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createMaterialTemplate } from '@/lib/actions/templates.actions'

export default function NewMaterialTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    startTransition(async () => {
      const result = await createMaterialTemplate({ name, description })
      if (result.error) { setError(result.error._form?.[0] ?? result.error.name?.[0] ?? 'Fehler.'); return }
      if (result.redirectTo) router.push(result.redirectTo)
    })
  }

  return (
    <div className="flex-1 p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Neue Material-Vorlage</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="z.B. Standard Padel Material" autoFocus required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Erstellen</button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border text-sm rounded-lg hover:bg-slate-50">Abbrechen</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create detail client component**

Create `components/templates/MaterialTemplateDetail.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import {
  updateMaterialTemplate, deleteMaterialTemplate,
  addMaterialTemplateItem, deleteMaterialTemplateItem,
} from '@/lib/actions/templates.actions'
import type { MaterialTemplate } from '@/lib/db/templates'

export function MaterialTemplateDetail({ template }: { template: MaterialTemplate }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [editingHeader, setEditingHeader] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSaveHeader() {
    startTransition(async () => {
      const result = await updateMaterialTemplate(template.id, { name, description })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setEditingHeader(false); router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm(`Vorlage „${template.name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deleteMaterialTemplate(template.id)
      router.push('/stammdaten/material-vorlagen')
    })
  }

  function handleAddItem() {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const result = await addMaterialTemplateItem(template.id, {
        title: newTitle,
        quantity: newQty ? parseFloat(newQty) : undefined,
        unit: newUnit || undefined,
        notes: newNotes || undefined,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setNewTitle(''); setNewQty(''); setNewUnit(''); setNewNotes('')
      router.refresh()
    })
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      await deleteMaterialTemplateItem(itemId, template.id)
      router.refresh()
    })
  }

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        {editingHeader ? (
          <div className="flex-1 space-y-2">
            <input className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
              value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm"
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <button onClick={handleSaveHeader} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Speichern</button>
              <button onClick={() => setEditingHeader(false)} className="px-3 py-1.5 border text-sm rounded-lg">Abbrechen</button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{template.name}</h1>
            {template.description && <p className="text-sm text-slate-500 mt-1">{template.description}</p>}
            <button onClick={() => setEditingHeader(true)} className="text-xs text-blue-600 hover:underline mt-1">Bearbeiten</button>
          </div>
        )}
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-medium text-slate-600">
          Einträge ({template.items.length})
        </div>
        {template.items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">Noch keine Einträge.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Bezeichnung</th>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-20">Menge</th>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-20">Einheit</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {template.items.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="text-slate-900">{item.title}</p>
                    {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{item.quantity ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.unit ?? '—'}</td>
                  <td className="px-2 py-2.5">
                    <button onClick={() => handleDeleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-4 py-3 border-t bg-slate-50 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input className="col-span-1 border rounded-lg px-3 py-2 text-sm" value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)} placeholder="Bezeichnung *" />
            <input className="border rounded-lg px-3 py-2 text-sm" value={newQty}
              onChange={(e) => setNewQty(e.target.value)} placeholder="Menge" type="number" min="0" step="any" />
            <input className="border rounded-lg px-3 py-2 text-sm" value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)} placeholder="Einheit" />
          </div>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)} placeholder="Notizen (optional)" />
          <button onClick={handleAddItem}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /> Eintrag hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create detail server page**

Create `app/(app)/stammdaten/material-vorlagen/[id]/page.tsx`:

```typescript
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMaterialTemplateById } from '@/lib/db/templates'
import { MaterialTemplateDetail } from '@/components/templates/MaterialTemplateDetail'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function MaterialTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth" err={err} />
  }
  const template = await getMaterialTemplateById(id)
  if (!template) notFound()
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Material-Vorlage" profile={profile} />
      <MaterialTemplateDetail template={template} />
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/stammdaten/material-vorlagen/ components/templates/MaterialTemplateDetail.tsx
git commit -m "feat: add Material-Vorlagen pages (overview + detail)"
```

---

### Task 8: Vorlagen-Sets Page

**Files:**
- Modify: `app/(app)/stammdaten/vorlagen-sets/page.tsx`
- Create: `components/templates/TemplateSetsClient.tsx`

- [ ] **Step 1: Create TemplateSetsClient component**

Create `components/templates/TemplateSetsClient.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Pencil, X, Check } from 'lucide-react'
import { createTemplateSet, updateTemplateSet, deleteTemplateSet } from '@/lib/actions/templates.actions'
import type { TemplateSet, TemplateOptions } from '@/lib/db/templates'

interface Props {
  sets: TemplateSet[]
  options: TemplateOptions
}

interface SetFormState {
  name: string
  description: string
  milestoneTemplateId: string
  punchlistTemplateId: string
  materialTemplateId: string
}

const emptyForm: SetFormState = {
  name: '', description: '', milestoneTemplateId: '', punchlistTemplateId: '', materialTemplateId: '',
}

export function TemplateSetsClient({ sets, options }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SetFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function startEdit(set: TemplateSet) {
    setEditingId(set.id)
    setForm({
      name: set.name,
      description: set.description ?? '',
      milestoneTemplateId: set.milestoneTemplateId ?? '',
      punchlistTemplateId: set.punchlistTemplateId ?? '',
      materialTemplateId: set.materialTemplateId ?? '',
    })
  }

  function handleCreate() {
    if (!form.name.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createTemplateSet({
        name: form.name, description: form.description,
        milestoneTemplateId: form.milestoneTemplateId || undefined,
        punchlistTemplateId: form.punchlistTemplateId || undefined,
        materialTemplateId: form.materialTemplateId || undefined,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setShowCreate(false); setForm(emptyForm); router.refresh()
    })
  }

  function handleUpdate(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateTemplateSet(id, {
        name: form.name, description: form.description,
        milestoneTemplateId: form.milestoneTemplateId || undefined,
        punchlistTemplateId: form.punchlistTemplateId || undefined,
        materialTemplateId: form.materialTemplateId || undefined,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setEditingId(null); router.refresh()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Set „${name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deleteTemplateSet(id)
      router.refresh()
    })
  }

  function SetFormFields() {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="z.B. Standard Padel Court" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Beschreibung</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Meilensteine</label>
            <select className="w-full border rounded-lg px-2 py-2 text-sm"
              value={form.milestoneTemplateId} onChange={(e) => setForm((f) => ({ ...f, milestoneTemplateId: e.target.value }))}>
              <option value="">— keine —</option>
              {options.milestones.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Checkliste</label>
            <select className="w-full border rounded-lg px-2 py-2 text-sm"
              value={form.punchlistTemplateId} onChange={(e) => setForm((f) => ({ ...f, punchlistTemplateId: e.target.value }))}>
              <option value="">— keine —</option>
              {options.punchlists.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Material</label>
            <select className="w-full border rounded-lg px-2 py-2 text-sm"
              value={form.materialTemplateId} onChange={(e) => setForm((f) => ({ ...f, materialTemplateId: e.target.value }))}>
              <option value="">— keine —</option>
              {options.materials.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {sets.map((set) => (
        <div key={set.id} className="bg-white rounded-xl border p-4">
          {editingId === set.id ? (
            <div className="space-y-3">
              <SetFormFields />
              <div className="flex gap-2">
                <button onClick={() => handleUpdate(set.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  <Check className="w-3.5 h-3.5" /> Speichern
                </button>
                <button onClick={() => setEditingId(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border text-sm rounded-lg hover:bg-slate-50">
                  <X className="w-3.5 h-3.5" /> Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{set.name}</h3>
                {set.description && <p className="text-xs text-slate-500 mt-0.5">{set.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {set.milestoneTemplate && (
                    <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
                      📍 {set.milestoneTemplate.name}
                    </span>
                  )}
                  {set.punchlistTemplate && (
                    <span className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded-full">
                      ✓ {set.punchlistTemplate.name}
                    </span>
                  )}
                  {set.materialTemplate && (
                    <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full">
                      📦 {set.materialTemplate.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(set)} className="text-slate-400 hover:text-slate-700 p-1">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(set.id, set.name)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showCreate ? (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-medium text-slate-900">Neues Set</h3>
          <SetFormFields />
          <div className="flex gap-2">
            <button onClick={handleCreate}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              <Check className="w-3.5 h-3.5" /> Erstellen
            </button>
            <button onClick={() => { setShowCreate(false); setForm(emptyForm) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 border text-sm rounded-lg hover:bg-slate-50">
              <X className="w-3.5 h-3.5" /> Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-dashed rounded-xl text-slate-500 hover:text-slate-700 hover:border-slate-400 w-full justify-center text-sm">
          <Plus className="w-4 h-4" /> Neues Set anlegen
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write the sets overview page**

Replace `app/(app)/stammdaten/vorlagen-sets/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTemplateSets, getTemplateOptions } from '@/lib/db/templates'
import { TemplateSetsClient } from '@/components/templates/TemplateSetsClient'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function TemplateSetsPage() {
  let profile: Profile | null = null
  let sets: Awaited<ReturnType<typeof getTemplateSets>> = []
  let options: Awaited<ReturnType<typeof getTemplateOptions>> = { milestones: [], punchlists: [], materials: [], sets: [] }
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile;
    [sets, options] = await Promise.all([getTemplateSets(), getTemplateOptions()])
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Vorlagen-Sets" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title={`Vorlagen-Sets (${sets.length})`} profile={profile} />
      <TemplateSetsClient sets={sets} options={options} />
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/stammdaten/vorlagen-sets/ components/templates/TemplateSetsClient.tsx
git commit -m "feat: add Vorlagen-Sets page"
```

---

### Task 9: Import Modal

**Files:**
- Create: `components/templates/ImportTemplateModal.tsx`

- [ ] **Step 1: Create ImportTemplateModal**

Create `components/templates/ImportTemplateModal.tsx`:

```typescript
'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { fetchTemplateOptions, importTemplate } from '@/lib/actions/templates.actions'
import type { TemplateOptions } from '@/lib/db/templates'

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
}

export function ImportTemplateModal({ projectId, open, onClose }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [options, setOptions] = useState<TemplateOptions | null>(null)
  const [mode, setMode] = useState<'set' | 'individual'>('set')
  const [selectedSetId, setSelectedSetId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [punchlistId, setPunchlistId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && !options) {
      fetchTemplateOptions().then((opts) => {
        if (opts) setOptions(opts)
      })
    }
  }, [open, options])

  // When a set is selected, auto-fill individual dropdowns
  function handleSetSelect(setId: string) {
    setSelectedSetId(setId)
    if (!setId || !options) { setMilestoneId(''); setPunchlistId(''); setMaterialId(''); return }
    // We need set details - find in options is not enough (we don't have the FK IDs in TemplateOptions)
    // The server action will resolve set IDs, so we pass the setId directly
  }

  // Resolve selected IDs (for 'set' mode, fetch set details)
  const [setDetails, setSetDetails] = useState<{ milestoneTemplateId?: string | null; punchlistTemplateId?: string | null; materialTemplateId?: string | null } | null>(null)

  useEffect(() => {
    if (mode === 'set' && selectedSetId) {
      // Fetch set details from options list (not available) - we pass setId to action instead
      setSetDetails(null)
    }
  }, [mode, selectedSetId])

  function getEffectiveIds() {
    if (mode === 'set' && selectedSetId) {
      // Pass setId - action will resolve it
      return { setId: selectedSetId, milestoneTemplateId: undefined, punchlistTemplateId: undefined, materialTemplateId: undefined }
    }
    return {
      setId: undefined,
      milestoneTemplateId: milestoneId || undefined,
      punchlistTemplateId: punchlistId || undefined,
      materialTemplateId: materialId || undefined,
    }
  }

  const hasSelection = mode === 'set'
    ? !!selectedSetId
    : !!(milestoneId || punchlistId || materialId)

  function handleImport() {
    if (!hasSelection) return
    setError(null); setLoading(true)

    const ids = getEffectiveIds()

    startTransition(async () => {
      // If set mode, we resolve the set template IDs server-side by passing setId
      // The importTemplate action accepts individual template IDs
      // So we need to resolve the set first, OR change the action signature
      // For simplicity: importTemplate also accepts an optional setId
      const result = await importTemplate(projectId, {
        milestoneTemplateId: ids.milestoneTemplateId,
        punchlistTemplateId: ids.punchlistTemplateId,
        materialTemplateId: ids.materialTemplateId,
        mode: importMode,
        // @ts-ignore - setId is handled below in the extended action
        setId: ids.setId,
      })
      setLoading(false)
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler beim Import.'); return }
      router.refresh()
      onClose()
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vorlage importieren</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        {!options ? (
          <p className="text-sm text-slate-400">Vorlagen werden geladen…</p>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                onClick={() => setMode('set')}
                className={`flex-1 py-2 font-medium transition-colors ${mode === 'set' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Set importieren
              </button>
              <button
                onClick={() => setMode('individual')}
                className={`flex-1 py-2 font-medium transition-colors ${mode === 'individual' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Einzelne Vorlagen
              </button>
            </div>

            {mode === 'set' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Set</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={selectedSetId} onChange={(e) => handleSetSelect(e.target.value)}>
                  <option value="">— Set auswählen —</option>
                  {options.sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {options.sets.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Noch keine Sets angelegt. Unter Stammdaten → Vorlagen-Sets erstellen.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meilensteine</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
                    <option value="">— keine —</option>
                    {options.milestones.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Checkliste</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={punchlistId} onChange={(e) => setPunchlistId(e.target.value)}>
                    <option value="">— keine —</option>
                    {options.punchlists.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                    <option value="">— keine —</option>
                    {options.materials.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Import mode */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Bestehende Einträge</p>
              <div className="flex gap-3">
                {(['replace', 'append'] as const).map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="importMode" value={m} checked={importMode === m}
                      onChange={() => setImportMode(m)} className="accent-blue-600" />
                    <span className="text-sm">{m === 'replace' ? 'Ersetzen' : 'Ergänzen'}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 px-4 py-2 border text-sm rounded-lg hover:bg-slate-50">
                Abbrechen
              </button>
              <button
                onClick={handleImport}
                disabled={!hasSelection || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird importiert…' : 'Importieren'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Extend importTemplate action to support setId**

In `lib/actions/templates.actions.ts`, modify the `importTemplate` function to resolve a `setId` if provided. Add `setId?: string` to the input and resolve it before processing:

After the `importTemplateSchema` definition in `lib/validations/template.schema.ts`, the schema already has the three template IDs. We'll handle `setId` at the action level without changing the schema.

Replace the `importTemplate` function in `lib/actions/templates.actions.ts`:

```typescript
export async function importTemplate(
  projectId: string,
  input: ImportTemplateInput & { setId?: string }
): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }

  let { milestoneTemplateId, punchlistTemplateId, materialTemplateId, mode } = input

  // Resolve set IDs if setId provided
  if (input.setId) {
    const { data: set } = await supabase
      .from('template_sets')
      .select('milestoneTemplateId, punchlistTemplateId, materialTemplateId')
      .eq('id', input.setId)
      .single()
    if (set) {
      milestoneTemplateId = set.milestoneTemplateId ?? undefined
      punchlistTemplateId = set.punchlistTemplateId ?? undefined
      materialTemplateId = set.materialTemplateId ?? undefined
    }
  }

  const parsed = importTemplateSchema.safeParse({ milestoneTemplateId, punchlistTemplateId, materialTemplateId, mode })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  async function getNextSort(table: string): Promise<number> {
    const { data } = await supabase
      .from(table).select('sortOrder').eq('projectId', projectId)
      .order('sortOrder', { ascending: false }).limit(1)
    return (data?.[0]?.sortOrder ?? -1) + 1
  }

  if (parsed.data.milestoneTemplateId) {
    if (parsed.data.mode === 'replace') {
      await supabase.from('project_milestones').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('milestone_template_items').select('title, description, sortOrder')
      .eq('templateId', parsed.data.milestoneTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = parsed.data.mode === 'append' ? await getNextSort('project_milestones') : 0
      await supabase.from('project_milestones').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId,
          title: item.title, description: item.description || null,
          sortOrder: offset + idx, updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  if (parsed.data.punchlistTemplateId) {
    if (parsed.data.mode === 'replace') {
      await supabase.from('project_punch_items').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('punchlist_template_items').select('title, sortOrder')
      .eq('templateId', parsed.data.punchlistTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = parsed.data.mode === 'append' ? await getNextSort('project_punch_items') : 0
      await supabase.from('project_punch_items').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId, title: item.title,
          sortOrder: offset + idx, updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  if (parsed.data.materialTemplateId) {
    if (parsed.data.mode === 'replace') {
      await supabase.from('project_material_items').delete().eq('projectId', projectId)
    }
    const { data: items } = await supabase
      .from('material_template_items').select('title, quantity, unit, notes, sortOrder')
      .eq('templateId', parsed.data.materialTemplateId).order('sortOrder')
    if (items && items.length > 0) {
      const offset = parsed.data.mode === 'append' ? await getNextSort('project_material_items') : 0
      await supabase.from('project_material_items').insert(
        items.map((item, idx) => ({
          id: randomUUID(), projectId,
          title: item.title, quantity: item.quantity ?? null,
          unit: item.unit ?? null, notes: item.notes ?? null,
          sortOrder: offset + idx, updatedAt: new Date().toISOString(),
        }))
      )
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return {}
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add components/templates/ImportTemplateModal.tsx lib/actions/templates.actions.ts
git commit -m "feat: add ImportTemplateModal with set resolution and replace/append modes"
```

---

### Task 10: Wire Import Modal into Project Cards

**Files:**
- Modify: `components/projects/MilestonesCard.tsx`
- Modify: `components/projects/PunchListCard.tsx`
- Modify: `components/projects/MaterialChecklistCard.tsx`
- Modify: `lib/actions/projects.actions.ts`

- [ ] **Step 1: Update MilestonesCard.tsx**

Replace the import block and `handleLoadTemplate` / "Vorlage laden" button:

Add import at top of `components/projects/MilestonesCard.tsx`:
```typescript
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal'
```

Remove this import (no longer needed):
```typescript
import { addMilestone, toggleMilestone, deleteMilestone, insertDefaultMilestones } from '@/lib/actions/projects.actions'
```

Replace with:
```typescript
import { addMilestone, toggleMilestone, deleteMilestone } from '@/lib/actions/projects.actions'
```

Add `showImport` state after the other `useState` calls:
```typescript
const [showImport, setShowImport] = useState(false)
```

Remove the entire `handleLoadTemplate` function.

Replace the "Vorlage laden" button in the JSX header:
```typescript
// OLD:
{total === 0 && (
  <Button type="button" size="sm" variant="outline" onClick={handleLoadTemplate}>
    <ListChecks className="w-4 h-4 mr-1" />Vorlage laden
  </Button>
)}

// NEW:
<Button type="button" size="sm" variant="outline" onClick={() => setShowImport(true)}>
  <ListChecks className="w-4 h-4 mr-1" />Vorlage laden
</Button>
```

Add the modal just before the closing `</Card>`:
```typescript
<ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
```

- [ ] **Step 2: Update PunchListCard.tsx**

Add import at top:
```typescript
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal'
```

Remove `insertDefaultPunchItems` from the import of `projects.actions`.

Add `showImport` state:
```typescript
const [showImport, setShowImport] = useState(false)
```

Remove `handleLoadTemplate` function.

Replace the "Vorlage laden" button (find the button that calls `handleLoadTemplate`):
```typescript
<Button type="button" size="sm" variant="outline" onClick={() => setShowImport(true)}>
  <ClipboardList className="w-4 h-4 mr-1" />Vorlage laden
</Button>
```

Add modal before closing `</Card>`:
```typescript
<ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
```

- [ ] **Step 3: Update MaterialChecklistCard.tsx**

Add import at top:
```typescript
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal'
```

Add `showImport` state:
```typescript
const [showImport, setShowImport] = useState(false)
```

Add "Vorlage laden" button in the CardHeader next to the existing "+ Material" button:
```typescript
<Button type="button" size="sm" variant="outline" onClick={() => setShowImport(true)}>
  <Boxes className="w-4 h-4 mr-1" />Vorlage laden
</Button>
```

Also add `Boxes` to the lucide-react import in MaterialChecklistCard.tsx.

Add modal before closing `</Card>`:
```typescript
<ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
```

- [ ] **Step 4: Remove hardcoded defaults from projects.actions.ts**

In `lib/actions/projects.actions.ts`:

1. Remove the `DEFAULT_MILESTONES` constant (lines 16-25).
2. Remove the `insertDefaultMilestonesForProject` helper function.
3. Remove the call `await insertDefaultMilestonesForProject(supabase, id)` inside `createProject`.
4. Remove the exported `insertDefaultMilestones` function.
5. Remove `insertDefaultPunchItems` export function and its hardcoded defaults array.

The `createProject` action should no longer auto-insert milestones — users will use the template import button instead.

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add components/projects/MilestonesCard.tsx components/projects/PunchListCard.tsx \
  components/projects/MaterialChecklistCard.tsx lib/actions/projects.actions.ts
git commit -m "feat: wire ImportTemplateModal into project cards, remove hardcoded defaults"
```
