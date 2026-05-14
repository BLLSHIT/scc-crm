-- ====================================================================
-- PHASE 3 — Projekte + Meilensteine + Anhänge
-- ====================================================================

DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('planning', 'ordered', 'installation', 'completed', 'on_hold', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1) projects
CREATE TABLE IF NOT EXISTS public.projects (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  status          "ProjectStatus" NOT NULL DEFAULT 'planning',

  "dealId"        TEXT REFERENCES public.deals(id)        ON DELETE SET NULL,
  "companyId"     TEXT REFERENCES public.companies(id)    ON DELETE SET NULL,
  "contactId"     TEXT REFERENCES public.contacts(id)     ON DELETE SET NULL,
  "teamMemberId"  TEXT REFERENCES public.team_members(id) ON DELETE SET NULL,

  "startDate"        TIMESTAMP(3),
  "plannedEndDate"   TIMESTAMP(3),
  "actualEndDate"    TIMESTAMP(3),

  -- Installations-Ort
  "locationStreet"   TEXT,
  "locationZip"      TEXT,
  "locationCity"     TEXT,
  "locationCountry"  TEXT,

  notes              TEXT,

  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS projects_status_idx     ON public.projects(status);
CREATE INDEX IF NOT EXISTS projects_company_idx    ON public.projects("companyId");
CREATE INDEX IF NOT EXISTS projects_deal_idx       ON public.projects("dealId");
CREATE INDEX IF NOT EXISTS projects_teamMember_idx ON public.projects("teamMemberId");
CREATE INDEX IF NOT EXISTS projects_planned_end_idx ON public.projects("plannedEndDate");

-- 2) project_milestones
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id           TEXT PRIMARY KEY,
  "projectId"  TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  "dueDate"    TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "sortOrder"  INT NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_milestones_project_idx ON public.project_milestones("projectId", "sortOrder");

-- 3) project_attachments (analog deal_attachments)
CREATE TABLE IF NOT EXISTS public.project_attachments (
  id             TEXT PRIMARY KEY,
  "projectId"    TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,
  "storagePath"  TEXT NOT NULL,
  "fileSize"     BIGINT,
  "mimeType"     TEXT,
  category       TEXT NOT NULL DEFAULT 'other',
  "uploadedBy"   TEXT,
  "uploadedByName" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_attachments_project_idx ON public.project_attachments("projectId", "createdAt" DESC);

-- 4) Storage-Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-attachments', 'project-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Auth read project_attachments storage"   ON storage.objects;
DROP POLICY IF EXISTS "Auth write project_attachments storage"  ON storage.objects;
DROP POLICY IF EXISTS "Auth delete project_attachments storage" ON storage.objects;
CREATE POLICY "Auth read project_attachments storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Auth write project_attachments storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete project_attachments storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-attachments' AND auth.role() = 'authenticated');

-- 5) Tasks → Projekte verlinken
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS "projectId" TEXT REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_project_idx ON public.tasks("projectId");

-- RLS
ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read projects"              ON public.projects;
DROP POLICY IF EXISTS "Auth write projects"             ON public.projects;
DROP POLICY IF EXISTS "Auth read project_milestones"    ON public.project_milestones;
DROP POLICY IF EXISTS "Auth write project_milestones"   ON public.project_milestones;
DROP POLICY IF EXISTS "Auth read project_attachments"   ON public.project_attachments;
DROP POLICY IF EXISTS "Auth write project_attachments"  ON public.project_attachments;

CREATE POLICY "Auth read projects"              ON public.projects             FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write projects"             ON public.projects             FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read project_milestones"    ON public.project_milestones   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write project_milestones"   ON public.project_milestones   FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read project_attachments"   ON public.project_attachments  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write project_attachments"  ON public.project_attachments  FOR ALL    USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
