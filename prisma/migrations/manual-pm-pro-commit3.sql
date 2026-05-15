-- PM-Pro Commit 3: Share-Token für Projekte
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "shareToken" TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON public.projects("shareToken") WHERE "shareToken" IS NOT NULL;
NOTIFY pgrst, 'reload schema';
