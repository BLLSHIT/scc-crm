-- Industries (Firmen-Branchen)
CREATE TABLE IF NOT EXISTS public.industries (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read industries"  ON public.industries;
DROP POLICY IF EXISTS "Auth write industries" ON public.industries;
CREATE POLICY "Auth read industries"  ON public.industries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write industries" ON public.industries FOR ALL    USING (auth.role() = 'authenticated');

INSERT INTO public.industries (id, name, "sortOrder") VALUES
  (gen_random_uuid()::text, 'Sportstätte', 10),
  (gen_random_uuid()::text, 'Kommune / Öffentliche Hand', 20),
  (gen_random_uuid()::text, 'Hotel & Resort', 30),
  (gen_random_uuid()::text, 'Immobilien', 40),
  (gen_random_uuid()::text, 'Fitness-Kette', 50),
  (gen_random_uuid()::text, 'Privatclub', 60),
  (gen_random_uuid()::text, 'Bildung', 70),
  (gen_random_uuid()::text, 'Sonstiges', 80)
ON CONFLICT (name) DO NOTHING;

-- Lead Sources (Kontakt-Quellen)
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read lead_sources"  ON public.lead_sources;
DROP POLICY IF EXISTS "Auth write lead_sources" ON public.lead_sources;
CREATE POLICY "Auth read lead_sources"  ON public.lead_sources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write lead_sources" ON public.lead_sources FOR ALL    USING (auth.role() = 'authenticated');

INSERT INTO public.lead_sources (id, name, "sortOrder") VALUES
  (gen_random_uuid()::text, 'Website',     10),
  (gen_random_uuid()::text, 'Messe',       20),
  (gen_random_uuid()::text, 'Event',       30),
  (gen_random_uuid()::text, 'Instagram',   40),
  (gen_random_uuid()::text, 'LinkedIn',    50),
  (gen_random_uuid()::text, 'Empfehlung',  60),
  (gen_random_uuid()::text, 'Telefon',     70),
  (gen_random_uuid()::text, 'E-Mail',      80),
  (gen_random_uuid()::text, 'Kaltakquise', 90),
  (gen_random_uuid()::text, 'Sonstiges',  100)
ON CONFLICT (name) DO NOTHING;

-- Projektstatus auf Deal (für Projekt-Tracking nach Gewinn)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "projectStatus" TEXT;

NOTIFY pgrst, 'reload schema';
