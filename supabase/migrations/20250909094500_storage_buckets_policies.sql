-- Create global projects bucket if using Variant B
insert into storage.buckets (id, name, public)
select 'projects', 'projects', false
where not exists (select 1 from storage.buckets where id = 'projects');

-- RLS policies for storage.objects to restrict access by project owner via projects.user_uuid
-- Assumes object path format for Variant B: projects/{project_id}/...

-- Enable RLS on storage.objects if not already
do $$ begin
  perform 1 from pg_tables where schemaname = 'storage' and tablename = 'objects';
  -- RLS is managed by Supabase; policies can be added
end $$;

-- Policy: Only allow authenticated users to read/write objects they own by project
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'projects_bucket_owner_rw'
  ) then
    create policy projects_bucket_owner_rw on storage.objects
      for all using (
        bucket_id = 'projects' and
        exists (
          select 1
          from public.projects p
          join public.profiles pr on pr.uuid = p.user_uuid
          where pr.id = auth.uid()
            and (
              -- object name starts with the project's folder
              position(p.id::text || '/' in (storage.objects.name)) = 1
            )
        )
      ) with check (
        bucket_id = 'projects' and
        exists (
          select 1
          from public.projects p
          join public.profiles pr on pr.uuid = p.user_uuid
          where pr.id = auth.uid()
            and (
              position(p.id::text || '/' in (storage.objects.name)) = 1
            )
        )
      );
  end if;
end $$;


