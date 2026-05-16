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
