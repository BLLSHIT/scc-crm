-- prisma/migrations/manual-meilensteine-gantt.sql
-- Add startDate column for Gantt chart support, migrate Aufbau milestones, remove obsolete columns

-- 1. Add startDate column
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS "startDate" DATE;

-- 2. Migrate existing Aufbau milestones:
--    previously dueDate = start, endDate = end
--    new model: startDate = start, dueDate = end
UPDATE public.project_milestones
SET "startDate" = "dueDate"::DATE,
    "dueDate"   = "endDate"
WHERE type = 'aufbau'
  AND "endDate" IS NOT NULL
  AND "startDate" IS NULL;

-- 3. Remove obsolete columns
ALTER TABLE public.project_milestones
  DROP COLUMN IF EXISTS "endDate",
  DROP COLUMN IF EXISTS type;

NOTIFY pgrst, 'reload schema';
