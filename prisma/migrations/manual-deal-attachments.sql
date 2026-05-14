-- 1) deal_attachments-Tabelle (Metadaten zu hochgeladenen Dateien)
CREATE TABLE IF NOT EXISTS public.deal_attachments (
  id            TEXT PRIMARY KEY,
  "dealId"      TEXT NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,        -- Pfad im Storage-Bucket
  "fileSize"    BIGINT,
  "mimeType"    TEXT,
  category      TEXT NOT NULL DEFAULT 'other',  -- 'lageplan' | 'rendering' | 'po' | 'other'
  "uploadedBy"  TEXT,                 -- userId
  "uploadedByName" TEXT,              -- denormalisiert
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deal_attachments_deal_idx ON public.deal_attachments("dealId", "createdAt" DESC);

ALTER TABLE public.deal_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read deal_attachments"  ON public.deal_attachments;
DROP POLICY IF EXISTS "Auth write deal_attachments" ON public.deal_attachments;
CREATE POLICY "Auth read deal_attachments"  ON public.deal_attachments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write deal_attachments" ON public.deal_attachments FOR ALL    USING (auth.role() = 'authenticated');

-- 2) Storage-Bucket 'deal-attachments' anlegen (privat, signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-attachments', 'deal-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "Auth read deal_attachments storage"  ON storage.objects;
DROP POLICY IF EXISTS "Auth write deal_attachments storage" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete deal_attachments storage" ON storage.objects;

CREATE POLICY "Auth read deal_attachments storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deal-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Auth write deal_attachments storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deal-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Auth delete deal_attachments storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'deal-attachments' AND auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
