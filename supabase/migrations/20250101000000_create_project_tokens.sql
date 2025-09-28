-- Create table to store Supabase OAuth tokens per project
create table if not exists public.project_tokens (
  project_id text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_in integer,
  updated_at timestamptz not null default now()
);

-- Enable RLS; service role key bypasses RLS automatically
alter table public.project_tokens enable row level security;

-- Optional: do not expose this table to anon users
-- No policies are created; without policies, anon service cannot access.





