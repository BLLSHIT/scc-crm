-- ====================================================================
-- PHASE 3 PM-Pro — Bautrupp, Standard-Meilensteine, Punch-List,
--                  Material-Checkliste, Status-Erweiterung, E-Mail-Templates,
--                  Public Share Token
-- ====================================================================

-- 1) build_teams (Bauteam)
CREATE TABLE IF NOT EXISTS public.build_teams (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  description              TEXT,
  "maxConcurrentProjects"  INT  NOT NULL DEFAULT 2,
  "isActive"               BOOLEAN NOT NULL DEFAULT TRUE,
  notes                    TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- 2) build_team_members (Bauarbeiter — oft Subunternehmer; eigene Tabelle)
CREATE TABLE IF NOT EXISTS public.build_team_members (
  id            TEXT PRIMARY KEY,
  "buildTeamId" TEXT NOT NULL REFERENCES public.build_teams(id) ON DELETE CASCADE,
  "firstName"   TEXT NOT NULL,
  "lastName"    TEXT NOT NULL,
  role          TEXT,
  phone         TEXT,
  email         TEXT,
  "isExternal"  BOOLEAN NOT NULL DEFAULT FALSE,
  "companyName" TEXT,
  notes         TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder"   INT NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS build_team_members_team_idx ON public.build_team_members("buildTeamId", "sortOrder");

-- 3) projects — erweitern
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS "buildTeamId"  TEXT REFERENCES public.build_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "reworkActive" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "shareToken"   TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS projects_buildTeam_idx ON public.projects("buildTeamId");
CREATE INDEX IF NOT EXISTS projects_shareToken_idx ON public.projects("shareToken");

-- 4) project_milestones — kind + icon ergänzen
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS icon TEXT;

-- 5) ProjectStatus erweitern
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'pre_acceptance';
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'rework';

-- 6) project_rework_items (Punch-List für Nacharbeiten — B4)
CREATE TABLE IF NOT EXISTS public.project_rework_items (
  id          TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position    TEXT,
  description TEXT NOT NULL,
  "photoUrl"  TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  assignee    TEXT,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_rework_items_project_idx ON public.project_rework_items("projectId", "sortOrder");

-- 7) project_delivery_items (Material-Checkliste bei Anlieferung — B6)
CREATE TABLE IF NOT EXISTS public.project_delivery_items (
  id                  TEXT PRIMARY KEY,
  "projectId"         TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  quantity            NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit                TEXT NOT NULL DEFAULT 'Stück',
  "deliveredQuantity" NUMERIC(12,2),
  "isDelivered"       BOOLEAN NOT NULL DEFAULT FALSE,
  "deliveredAt"       TIMESTAMP(3),
  notes               TEXT,
  "sortOrder"         INT NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_delivery_items_project_idx ON public.project_delivery_items("projectId", "sortOrder");

-- 8) project_email_templates (B7)
CREATE TABLE IF NOT EXISTS public.project_email_templates (
  id            TEXT PRIMARY KEY,
  "triggerKind" TEXT NOT NULL,
  name          TEXT NOT NULL,
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  "autoSend"    BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- 9) RLS
ALTER TABLE public.build_teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_team_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_rework_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_delivery_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_email_templates  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read build_teams"             ON public.build_teams;
DROP POLICY IF EXISTS "Auth write build_teams"            ON public.build_teams;
DROP POLICY IF EXISTS "Auth read build_team_members"      ON public.build_team_members;
DROP POLICY IF EXISTS "Auth write build_team_members"     ON public.build_team_members;
DROP POLICY IF EXISTS "Auth read project_rework_items"    ON public.project_rework_items;
DROP POLICY IF EXISTS "Auth write project_rework_items"   ON public.project_rework_items;
DROP POLICY IF EXISTS "Auth read project_delivery_items"  ON public.project_delivery_items;
DROP POLICY IF EXISTS "Auth write project_delivery_items" ON public.project_delivery_items;
DROP POLICY IF EXISTS "Auth read project_email_templates" ON public.project_email_templates;
DROP POLICY IF EXISTS "Auth write project_email_templates" ON public.project_email_templates;
DROP POLICY IF EXISTS "Public read projects via share token" ON public.projects;
DROP POLICY IF EXISTS "Public read project_milestones via share token" ON public.project_milestones;
DROP POLICY IF EXISTS "Public read project_attachments via share token" ON public.project_attachments;

CREATE POLICY "Auth read build_teams"             ON public.build_teams             FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write build_teams"            ON public.build_teams             FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read build_team_members"      ON public.build_team_members      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write build_team_members"     ON public.build_team_members      FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read project_rework_items"    ON public.project_rework_items    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write project_rework_items"   ON public.project_rework_items    FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read project_delivery_items"  ON public.project_delivery_items  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write project_delivery_items" ON public.project_delivery_items  FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read project_email_templates" ON public.project_email_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write project_email_templates" ON public.project_email_templates FOR ALL   USING (auth.role() = 'authenticated');

-- Public Share-Policies (für B8 Kunden-Statusseite via Token)
-- NICHT-authentifizierte Anfragen dürfen lesen wenn shareToken in URL = projects.shareToken
-- → Wird in der Anwendung über Service-Role-Key gelöst, daher hier nicht zwingend nötig

NOTIFY pgrst, 'reload schema';
