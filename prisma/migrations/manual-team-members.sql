-- ====================================================================
-- TEAM-MEMBERS-Modul: SCC-interne Ansprechpartner
-- In Supabase Dashboard → SQL Editor einfügen + ausführen
-- ====================================================================

-- 1) team_members-Tabelle
CREATE TABLE IF NOT EXISTS public.team_members (
  id          TEXT PRIMARY KEY,
  "firstName" TEXT NOT NULL,
  "lastName"  TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  mobile      TEXT,
  position    TEXT,
  "avatarUrl" TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- 2) deals.teamMemberId-Spalte
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS "teamMemberId" TEXT
  REFERENCES public.team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS deals_team_member_idx ON public.deals("teamMemberId");

-- 3) RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read team_members"  ON public.team_members;
DROP POLICY IF EXISTS "Authenticated write team_members" ON public.team_members;

CREATE POLICY "Authenticated read team_members"
  ON public.team_members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write team_members"
  ON public.team_members FOR ALL
  USING (auth.role() = 'authenticated');
