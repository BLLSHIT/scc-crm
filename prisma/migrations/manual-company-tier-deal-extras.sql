-- Customer-Tier auf Firma
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tier TEXT;
-- Werte: 'premium' | 'key_account' | 'standard' | NULL

-- Adresse/Standort auf Deal (für Pipeline-Card)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS "locationStreet" TEXT,
  ADD COLUMN IF NOT EXISTS "locationZip"    TEXT,
  ADD COLUMN IF NOT EXISTS "locationCity"   TEXT,
  ADD COLUMN IF NOT EXISTS "locationCountry" TEXT,
  ADD COLUMN IF NOT EXISTS "plannedDelivery" TIMESTAMP(3);

NOTIFY pgrst, 'reload schema';
