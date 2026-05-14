-- ====================================================================
-- Kategorien-Tabelle + Seed + EK-Preis (purchase price) auf Produkten
-- In Supabase Dashboard → SQL Editor einfügen + ausführen
-- ====================================================================

-- 1) product_categories
CREATE TABLE IF NOT EXISTS public.product_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read product_categories"  ON public.product_categories;
DROP POLICY IF EXISTS "Authenticated write product_categories" ON public.product_categories;
CREATE POLICY "Authenticated read product_categories"  ON public.product_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write product_categories" ON public.product_categories FOR ALL    USING (auth.role() = 'authenticated');

INSERT INTO public.product_categories (id, name, "sortOrder") VALUES
  (gen_random_uuid()::text, 'Court',       10),
  (gen_random_uuid()::text, 'Belag',       20),
  (gen_random_uuid()::text, 'Beleuchtung', 30),
  (gen_random_uuid()::text, 'Zaunanlage',  40),
  (gen_random_uuid()::text, 'Zubehör',     50),
  (gen_random_uuid()::text, 'Service',     60),
  (gen_random_uuid()::text, 'Beratung',    70),
  (gen_random_uuid()::text, 'Sonstiges',   80)
ON CONFLICT (name) DO NOTHING;

-- 2) EK-Preis auf Produkten (nur intern!)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS "purchasePriceNet" NUMERIC(12,2) NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
