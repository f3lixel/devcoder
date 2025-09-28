-- Create projects table if missing
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Projektname',
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

-- Create files table if missing
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  path text not null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.files enable row level security;

-- Ensure unique index for upserts on (project_id, path)
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'files_project_path_uidx'
  ) then
    create unique index files_project_path_uidx on public.files(project_id, path);
  end if;
end $$;

-- Projects policies: owner can manage, authenticated can insert self-owned
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_owner_select'
  ) then
    create policy projects_owner_select on public.projects
      for select using ( auth.uid() = owner_id );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_owner_modify'
  ) then
    create policy projects_owner_modify on public.projects
      for all using ( auth.uid() = owner_id ) with check ( auth.uid() = owner_id );
  end if;
end $$;

-- Files policies: project owner can manage
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'files' and policyname = 'files_owner_select'
  ) then
    create policy files_owner_select on public.files
      for select using (
        exists (
          select 1 from public.projects p where p.id = files.project_id and p.owner_id = auth.uid()
        )
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'files' and policyname = 'files_owner_modify'
  ) then
    create policy files_owner_modify on public.files
      for all using (
        exists (
          select 1 from public.projects p where p.id = files.project_id and p.owner_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.projects p where p.id = files.project_id and p.owner_id = auth.uid()
        )
      );
  end if;
end $$;


