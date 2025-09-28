-- Projects API compatibility migration (non-breaking)
-- - Adds alias columns and indexes to match API expectations
-- - Preserves existing UUID-based primary key and owner-based policies

-- 1) Ensure description column exists
alter table public.projects
  add column if not exists description text;

-- 2) Add user_id as an alias of owner_id for API consistency
--    Generated column keeps data in one place
alter table public.projects
  add column if not exists user_id uuid generated always as (owner_id) stored;

-- 3) Add metadata as an alias of meta for API consistency
alter table public.projects
  add column if not exists metadata jsonb generated always as (meta) stored;

-- 4) Index for user_id for faster lookups
create index if not exists idx_projects_user_id on public.projects(user_id);

-- 5) Ensure RLS is enabled (idempotent)
alter table public.projects enable row level security;

-- 6) Add API-oriented RLS policies (idempotent) using user_id
--    This complements existing owner-based policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Project select own'
  ) THEN
    CREATE POLICY "Project select own" ON public.projects
      FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Project insert own'
  ) THEN
    CREATE POLICY "Project insert own" ON public.projects
      FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Project update own'
  ) THEN
    CREATE POLICY "Project update own" ON public.projects
      FOR UPDATE TO authenticated
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Project delete own'
  ) THEN
    CREATE POLICY "Project delete own" ON public.projects
      FOR DELETE TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;
