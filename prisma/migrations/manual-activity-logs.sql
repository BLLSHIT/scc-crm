CREATE TABLE IF NOT EXISTS public.activity_logs (
  id           TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL,        -- 'contact','company','deal','quote','task','team_member','product'
  "entityId"   TEXT NOT NULL,
  action       TEXT NOT NULL,        -- 'created','updated','deleted','status_changed','file_uploaded'
  "userId"     TEXT,
  "userName"   TEXT,                 -- denormalisiert (überlebt User-Löschung)
  summary      TEXT,                 -- z.B. "Status: draft → sent" oder "3 Felder geändert"
  metadata     JSONB,                -- optional: Diff / Details
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_logs_entity_idx ON public.activity_logs("entityType", "entityId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON public.activity_logs("createdAt" DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read activity_logs"  ON public.activity_logs;
DROP POLICY IF EXISTS "Auth write activity_logs" ON public.activity_logs;
CREATE POLICY "Auth read activity_logs"  ON public.activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write activity_logs" ON public.activity_logs FOR ALL    USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
