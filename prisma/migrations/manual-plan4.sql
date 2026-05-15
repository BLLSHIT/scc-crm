-- note_entries: manuelle Notizen/Kommentare auf Entities
CREATE TABLE IF NOT EXISTS public.note_entries (
  id           TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL CHECK ("entityType" IN ('deal','contact','company','project')),
  "entityId"   TEXT NOT NULL,
  body         TEXT NOT NULL,
  "authorId"   TEXT,
  "authorName" TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_note_entries_entity
  ON public.note_entries ("entityType", "entityId", "createdAt" DESC);

ALTER TABLE public.note_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read note_entries"  ON public.note_entries;
DROP POLICY IF EXISTS "Auth write note_entries" ON public.note_entries;
CREATE POLICY "Auth read note_entries"  ON public.note_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write note_entries" ON public.note_entries FOR ALL    USING (auth.role() = 'authenticated');

-- workflow_rules: konfigurierbare Automatisierungen
CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  "isEnabled"     BOOLEAN NOT NULL DEFAULT true,
  "triggerType"   TEXT NOT NULL CHECK ("triggerType" IN (
    'deal_stage_changed',
    'quote_expiring',
    'deal_inactive',
    'project_status_changed'
  )),
  "triggerConfig" JSONB NOT NULL DEFAULT '{}',
  "actionType"    TEXT NOT NULL CHECK ("actionType" IN (
    'create_task',
    'create_project'
  )),
  "actionConfig"  JSONB NOT NULL DEFAULT '{}',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read workflow_rules"  ON public.workflow_rules;
DROP POLICY IF EXISTS "Auth write workflow_rules" ON public.workflow_rules;
CREATE POLICY "Auth read workflow_rules"  ON public.workflow_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write workflow_rules" ON public.workflow_rules FOR ALL    USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
