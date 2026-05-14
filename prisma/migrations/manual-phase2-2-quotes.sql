-- ====================================================================
-- PHASE 2.2 — Schritt A: Quotes + QuoteLineItems
-- In Supabase Dashboard → SQL Editor einfügen + ausführen
-- ====================================================================

-- 1) Enum
DO $$ BEGIN
  CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) quotes
CREATE TABLE IF NOT EXISTS public.quotes (
  id                TEXT PRIMARY KEY,
  "quoteNumber"     TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  status            "QuoteStatus" NOT NULL DEFAULT 'draft',
  "validUntil"      TIMESTAMP(3) NOT NULL,
  "companyId"       TEXT REFERENCES public.companies(id)     ON DELETE SET NULL,
  "contactId"       TEXT REFERENCES public.contacts(id)      ON DELETE SET NULL,
  "teamMemberId"    TEXT REFERENCES public.team_members(id)  ON DELETE SET NULL,
  "dealId"          TEXT REFERENCES public.deals(id)         ON DELETE SET NULL,
  "subtotalNet"     NUMERIC(12,2) NOT NULL DEFAULT 0,
  "totalDiscount"   NUMERIC(12,2) NOT NULL DEFAULT 0,
  "totalVat"        NUMERIC(12,2) NOT NULL DEFAULT 0,
  "totalGross"      NUMERIC(12,2) NOT NULL DEFAULT 0,
  greeting          TEXT,
  intro             TEXT,
  footer            TEXT,
  "paymentTerms"    TEXT,
  "sentAt"          TIMESTAMP(3),
  "acceptedAt"      TIMESTAMP(3),
  "declinedAt"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quotes_status_idx   ON public.quotes(status);
CREATE INDEX IF NOT EXISTS quotes_company_idx  ON public.quotes("companyId");
CREATE INDEX IF NOT EXISTS quotes_deal_idx     ON public.quotes("dealId");
CREATE INDEX IF NOT EXISTS quotes_created_idx  ON public.quotes("createdAt");

-- 3) quote_line_items
CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id                TEXT PRIMARY KEY,
  "quoteId"         TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  "productId"       TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  "imageUrl"        TEXT,
  unit              TEXT NOT NULL DEFAULT 'Stück',
  quantity          NUMERIC(12,2) NOT NULL DEFAULT 1,
  "unitPriceNet"    NUMERIC(12,2) NOT NULL DEFAULT 0,
  "discountPercent" NUMERIC(5,2)  NOT NULL DEFAULT 0,
  "vatRate"         NUMERIC(5,2)  NOT NULL DEFAULT 19,
  "isOptional"      BOOLEAN NOT NULL DEFAULT FALSE,
  "sortOrder"       INT NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quote_line_items_quote_idx ON public.quote_line_items("quoteId");

-- 4) RLS
ALTER TABLE public.quotes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read quotes"            ON public.quotes;
DROP POLICY IF EXISTS "Authenticated write quotes"           ON public.quotes;
DROP POLICY IF EXISTS "Authenticated read quote_line_items"  ON public.quote_line_items;
DROP POLICY IF EXISTS "Authenticated write quote_line_items" ON public.quote_line_items;

CREATE POLICY "Authenticated read quotes"            ON public.quotes            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write quotes"           ON public.quotes            FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read quote_line_items"  ON public.quote_line_items  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write quote_line_items" ON public.quote_line_items  FOR ALL    USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
