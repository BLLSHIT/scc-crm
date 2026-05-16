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
