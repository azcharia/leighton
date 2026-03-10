-- ============================================================
-- Leighton Asia AI-Assisted Punchlist — Initial Schema
-- ============================================================

-- 1. DEFECTS TABLE
create table if not exists public.defects (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  image_url         text not null,
  audio_transcript  text not null,
  defect_type       text,
  priority          text check (priority in ('Low', 'Medium', 'High', 'Critical')),
  responsible_trade text,
  suggested_action  text,
  status            text not null default 'Pending AI'
    check (status in ('Pending AI', 'Processed', 'Resolved'))
);

-- Enable Row Level Security
alter table public.defects enable row level security;

-- Allow anonymous read (for dashboard) and insert (from mobile app)
-- In production, replace with proper auth policies.
drop policy if exists "Public read"   on public.defects;
drop policy if exists "Public insert" on public.defects;
drop policy if exists "Public update" on public.defects;

create policy "Public read" on public.defects
  for select using (true);

create policy "Public insert" on public.defects
  for insert with check (true);

create policy "Public update" on public.defects
  for update using (true);

-- Enable Realtime on defects table (idempotent guard)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'defects'
  ) then
    alter publication supabase_realtime add table public.defects;
  end if;
end $$;

-- ============================================================
-- 2. STORAGE BUCKET
-- ============================================================

-- Create a public bucket for defect images
insert into storage.buckets (id, name, public)
values ('defect_images', 'defect_images', true)
on conflict (id) do nothing;

-- Storage policy: allow anyone to upload
drop policy if exists "Public upload to defect_images" on storage.objects;
drop policy if exists "Public read from defect_images"  on storage.objects;

create policy "Public upload to defect_images"
  on storage.objects for insert
  with check (bucket_id = 'defect_images');

-- Storage policy: allow anyone to read
create policy "Public read from defect_images"
  on storage.objects for select
  using (bucket_id = 'defect_images');

-- ============================================================
-- 3. EDGE FUNCTION HTTP EXTENSION (required for pg_net)
-- ============================================================

-- pg_net is pre-installed on Supabase; just ensure it is enabled.
create extension if not exists pg_net schema extensions;

-- ============================================================
-- 4. TRIGGER FUNCTION — calls classify-defect Edge Function
-- ============================================================
-- Credentials are stored in Supabase Vault (never in this file).
-- Before running this migration, seed the vault with:
--
--   SELECT vault.create_secret(
--     'https://<PROJECT_REF>.supabase.co/functions/v1/classify-defect',
--     'edge_function_url'
--   );
--   SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--
-- Run those two SELECTs manually in the SQL Editor (do NOT commit
-- them to Git — they contain real credentials).

create or replace function public.trigger_classify_defect()
returns trigger
language plpgsql
security definer
as $$
declare
  server_url       text;
  service_role_key text;
  payload          jsonb;
begin
  -- Read secrets from Supabase Vault at runtime (never stored in source)
  select decrypted_secret into server_url
    from vault.decrypted_secrets where name = 'edge_function_url' limit 1;

  select decrypted_secret into service_role_key
    from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  payload := jsonb_build_object('record', row_to_json(NEW));

  -- Fire-and-forget HTTP POST via pg_net (non-blocking)
  perform net.http_post(
    url     := server_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body    := payload
  );

  return NEW;
end;
$$;

-- Attach trigger to defects table (fires AFTER INSERT)
drop trigger if exists on_defect_inserted on public.defects;

create trigger on_defect_inserted
  after insert on public.defects
  for each row
  execute procedure public.trigger_classify_defect();
