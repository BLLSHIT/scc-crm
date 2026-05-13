-- ====================================================================
-- Erweiterte Kontakt-/Firmen-Felder
-- In Supabase Dashboard → SQL Editor einfügen + ausführen
-- ====================================================================

-- Contacts: Mobil, LinkedIn, Instagram
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS mobile    TEXT,
  ADD COLUMN IF NOT EXISTS linkedin  TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Companies: LinkedIn, Instagram
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS linkedin  TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT;
