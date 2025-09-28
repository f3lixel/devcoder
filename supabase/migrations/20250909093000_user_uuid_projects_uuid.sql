-- 1) Ensure uuid extension available for uuid_generate_v4 (if using uuid-ossp)
create extension if not exists "uuid-ossp";

-- 2) Add uuid column on profiles (user profile table) with default
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'uuid'
  ) then
    alter table public.profiles add column uuid uuid;
    alter table public.profiles alter column uuid set default uuid_generate_v4();
    update public.profiles set uuid = coalesce(uuid, uuid_generate_v4());
    alter table public.profiles alter column uuid set not null;
    create unique index if not exists profiles_uuid_uidx on public.profiles(uuid);
  end if;
end $$;

-- 3) Add user_uuid on projects; backfill from profiles by owner_id; set FK
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'user_uuid'
  ) then
    alter table public.projects add column user_uuid uuid;
    -- backfill: projects.owner_id -> profiles.uuid
    update public.projects p
      set user_uuid = pr.uuid
      from public.profiles pr
      where pr.id = p.owner_id and p.user_uuid is null;
    alter table public.projects alter column user_uuid set not null;
    alter table public.projects
      add constraint projects_user_uuid_fk foreign key (user_uuid)
      references public.profiles(uuid) on delete cascade;
    create index if not exists projects_user_uuid_idx on public.projects(user_uuid);
  end if;
end $$;

-- 4) RLS policies to authorize via UUID (keep existing owner_id ones for compatibility)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_owner_uuid_select'
  ) then
    create policy projects_owner_uuid_select on public.projects
      for select using (
        exists (
          select 1 from public.profiles pr where pr.uuid = public.projects.user_uuid and pr.id = auth.uid()
        )
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_owner_uuid_modify'
  ) then
    create policy projects_owner_uuid_modify on public.projects
      for all using (
        exists (
          select 1 from public.profiles pr where pr.uuid = public.projects.user_uuid and pr.id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.profiles pr where pr.uuid = public.projects.user_uuid and pr.id = auth.uid()
        )
      );
  end if;
end $$;

-- 5) Ensure files linkage still enforced by project FK; optional index by user_uuid through join if needed


