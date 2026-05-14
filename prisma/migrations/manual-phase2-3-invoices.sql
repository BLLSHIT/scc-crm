-- ====================================================================
-- PHASE 2.3 — Rechnungen + Positionen + Zahlungseingänge
-- ====================================================================

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'open', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id                       TEXT PRIMARY KEY,
  "invoiceNumber"          TEXT NOT NULL UNIQUE,
  title                    TEXT NOT NULL,
  status                   "InvoiceStatus" NOT NULL DEFAULT 'draft',
  "issueDate"              TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "dueDate"                TIMESTAMP(3) NOT NULL,
  "companyId"              TEXT REFERENCES public.companies(id)     ON DELETE SET NULL,
  "contactId"              TEXT REFERENCES public.contacts(id)      ON DELETE SET NULL,
  "teamMemberId"           TEXT REFERENCES public.team_members(id)  ON DELETE SET NULL,
  "dealId"                 TEXT REFERENCES public.deals(id)         ON DELETE SET NULL,
  "quoteId"                TEXT REFERENCES public.quotes(id)        ON DELETE SET NULL,
  "subtotalNet"            NUMERIC(12,2) NOT NULL DEFAULT 0,
  "totalDiscount"          NUMERIC(12,2) NOT NULL DEFAULT 0,
  "globalDiscountPercent"  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  "totalVat"               NUMERIC(12,2) NOT NULL DEFAULT 0,
  "totalGross"             NUMERIC(12,2) NOT NULL DEFAULT 0,
  "totalPaid"              NUMERIC(12,2) NOT NULL DEFAULT 0,
  greeting                 TEXT,
  intro                    TEXT,
  footer                   TEXT,
  "paymentTerms"           TEXT,
  "sentAt"                 TIMESTAMP(3),
  "paidAt"                 TIMESTAMP(3),
  "cancelledAt"            TIMESTAMP(3),
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invoices_status_idx    ON public.invoices(status);
CREATE INDEX IF NOT EXISTS invoices_company_idx   ON public.invoices("companyId");
CREATE INDEX IF NOT EXISTS invoices_deal_idx      ON public.invoices("dealId");
CREATE INDEX IF NOT EXISTS invoices_quote_idx     ON public.invoices("quoteId");
CREATE INDEX IF NOT EXISTS invoices_duedate_idx   ON public.invoices("dueDate");

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id                TEXT PRIMARY KEY,
  "invoiceId"       TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  "itemType"        TEXT NOT NULL DEFAULT 'product',
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
CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_idx ON public.invoice_line_items("invoiceId");

CREATE TABLE IF NOT EXISTS public.payments (
  id              TEXT PRIMARY KEY,
  "invoiceId"     TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  "paymentDate"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "paymentMethod" TEXT,                -- 'Überweisung','Bar','SEPA','PayPal','Sonstiges'
  reference       TEXT,                -- Verwendungszweck / Belegnummer
  notes           TEXT,
  "recordedBy"    TEXT,                -- userId
  "recordedByName" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON public.payments("invoiceId", "paymentDate" DESC);

ALTER TABLE public.invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read invoices"             ON public.invoices;
DROP POLICY IF EXISTS "Auth write invoices"            ON public.invoices;
DROP POLICY IF EXISTS "Auth read invoice_line_items"   ON public.invoice_line_items;
DROP POLICY IF EXISTS "Auth write invoice_line_items"  ON public.invoice_line_items;
DROP POLICY IF EXISTS "Auth read payments"             ON public.payments;
DROP POLICY IF EXISTS "Auth write payments"            ON public.payments;

CREATE POLICY "Auth read invoices"             ON public.invoices            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write invoices"            ON public.invoices            FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read invoice_line_items"   ON public.invoice_line_items  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write invoice_line_items"  ON public.invoice_line_items  FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read payments"             ON public.payments            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write payments"            ON public.payments            FOR ALL    USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
