-- ====================================================================
-- PHASE 2.2 — Editor-Extras: Freitextzeile + Gesamtrabatt
-- ====================================================================

ALTER TABLE public.quote_line_items
  ADD COLUMN IF NOT EXISTS "itemType" TEXT NOT NULL DEFAULT 'product';
-- Werte: 'product' | 'text'  (later: 'subtotal', 'section'…)

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS "globalDiscountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
