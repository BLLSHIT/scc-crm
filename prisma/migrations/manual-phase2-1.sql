-- ====================================================================
-- PHASE 2.1: Settings + Products + Text Modules
-- In Supabase Dashboard → SQL Editor einfügen + ausführen
-- ====================================================================

-- 1) Settings (Singleton)
CREATE TABLE IF NOT EXISTS public.settings (
  id                       TEXT PRIMARY KEY DEFAULT 'singleton',
  "companyName"            TEXT,
  "companyAddress"         TEXT,
  "companyZip"             TEXT,
  "companyCity"            TEXT,
  "companyCountry"         TEXT DEFAULT 'Deutschland',
  "companyEmail"           TEXT,
  "companyPhone"           TEXT,
  "companyWebsite"         TEXT,
  "taxNumber"              TEXT,
  "ustId"                  TEXT,
  "bankName"               TEXT,
  "bankIban"               TEXT,
  "bankBic"                TEXT,
  "logoUrl"                TEXT,
  "defaultQuoteValidity"   INT  NOT NULL DEFAULT 30,
  "defaultInvoiceDueDays"  INT  NOT NULL DEFAULT 14,
  "quoteNumberPrefix"      TEXT NOT NULL DEFAULT 'AN',
  "invoiceNumberPrefix"    TEXT NOT NULL DEFAULT 'RE',
  "nextQuoteSeq"           INT  NOT NULL DEFAULT 1,
  "nextInvoiceSeq"         INT  NOT NULL DEFAULT 1,
  "currentYear"            INT  NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT settings_singleton CHECK (id = 'singleton')
);
INSERT INTO public.settings (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING;

-- 2) Products
CREATE TABLE IF NOT EXISTS public.products (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT,
  sku                 TEXT,
  category            TEXT,
  unit                TEXT NOT NULL DEFAULT 'Stück',
  "defaultPriceNet"   NUMERIC(12,2) NOT NULL DEFAULT 0,
  "defaultVatRate"    NUMERIC(5,2)  NOT NULL DEFAULT 19,
  "imageUrl"          TEXT,
  "isActive"          BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS products_active_idx   ON public.products("isActive");

-- 3) Text Modules
DO $$ BEGIN
  CREATE TYPE "TextModuleType" AS ENUM ('greeting', 'intro', 'footer', 'payment_terms', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.text_modules (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        "TextModuleType" NOT NULL,
  content     TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS text_modules_type_idx ON public.text_modules(type);

-- 4) RLS
ALTER TABLE public.settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_modules  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read settings"      ON public.settings;
DROP POLICY IF EXISTS "Authenticated write settings"     ON public.settings;
DROP POLICY IF EXISTS "Authenticated read products"      ON public.products;
DROP POLICY IF EXISTS "Authenticated write products"     ON public.products;
DROP POLICY IF EXISTS "Authenticated read text_modules"  ON public.text_modules;
DROP POLICY IF EXISTS "Authenticated write text_modules" ON public.text_modules;

CREATE POLICY "Authenticated read settings"      ON public.settings      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write settings"     ON public.settings      FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read products"      ON public.products      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write products"     ON public.products      FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read text_modules"  ON public.text_modules  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write text_modules" ON public.text_modules  FOR ALL    USING (auth.role() = 'authenticated');
