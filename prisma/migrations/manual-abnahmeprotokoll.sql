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
