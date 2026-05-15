-- PM-Pro Commit 2: Punch-List, Material-Checklist, buildTeamId on projects
-- Run in Supabase SQL Editor

-- buildTeamId already exists on projects (used by build-teams queries),
-- but add IF NOT EXISTS to be safe
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "buildTeamId" TEXT REFERENCES public.build_teams(id) ON DELETE SET NULL;

-- Punch-List (Abnahme-Checkliste)
CREATE TABLE IF NOT EXISTS public.project_punch_items (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "isDone" BOOLEAN NOT NULL DEFAULT false,
  "doneAt" TIMESTAMPTZ,
  "doneBy" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_punch_items_project ON public.project_punch_items("projectId");

-- Material-Checklist
CREATE TABLE IF NOT EXISTS public.project_material_items (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  "isOrdered" BOOLEAN NOT NULL DEFAULT false,
  "isArrived" BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_material_items_project ON public.project_material_items("projectId");

-- Enable RLS (same policy as other project-related tables)
ALTER TABLE public.project_punch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "authenticated_all_punch" ON public.project_punch_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "authenticated_all_material" ON public.project_material_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
