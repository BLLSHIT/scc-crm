-- Verlinkt ein Team-Mitglied mit einem auth-fähigen Profil (= Supabase Auth User).
-- Eingeladene Mitglieder bekommen hier ihre Profile-ID nach erfolgreichem Login eingetragen.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS "profileId" TEXT REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS team_members_profile_idx ON public.team_members("profileId");

NOTIFY pgrst, 'reload schema';
