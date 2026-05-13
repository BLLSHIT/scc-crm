-- ====================================================================
-- TASKS-Modul: Schema-Migration
-- In Supabase Dashboard → SQL Editor einfügen + ausführen
-- ====================================================================

-- 1) Enum-Typen
DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('open', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) tasks-Tabelle
CREATE TABLE IF NOT EXISTS public.tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      "TaskStatus" NOT NULL DEFAULT 'open',
  priority    "TaskPriority" NOT NULL DEFAULT 'medium',
  "dueDate"   TIMESTAMP(3),
  "assigneeId" TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  "dealId"     TEXT REFERENCES public.deals(id)     ON DELETE SET NULL,
  "contactId"  TEXT REFERENCES public.contacts(id)  ON DELETE SET NULL,
  "companyId"  TEXT REFERENCES public.companies(id) ON DELETE SET NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- 3) Indexe
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON public.tasks("assigneeId");
CREATE INDEX IF NOT EXISTS tasks_due_idx      ON public.tasks("dueDate");
CREATE INDEX IF NOT EXISTS tasks_status_idx   ON public.tasks(status);

-- 4) Row-Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read tasks"  ON public.tasks;
DROP POLICY IF EXISTS "Authenticated write tasks" ON public.tasks;

CREATE POLICY "Authenticated read tasks"
  ON public.tasks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write tasks"
  ON public.tasks FOR ALL
  USING (auth.role() = 'authenticated');
