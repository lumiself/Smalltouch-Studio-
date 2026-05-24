-- Smalltouch Studio — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database.

-- ─────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  token_balance integer not null default 0,
  package_id text,
  package_set_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.token_vouchers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  package_id text not null,
  value integer not null,
  is_used boolean not null default false,
  used_by uuid references public.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  panel text not null,
  payload jsonb not null,
  layer_opacities jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  panel text not null,
  operation text not null,
  status text not null default 'pending',
  external_job_id text,
  input_path text,
  output_path text,
  tokens_used integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.batch_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  preset_id uuid references public.presets(id),
  panel text not null,
  total_images integer not null default 0,
  completed_images integer not null default 0,
  tokens_used integer not null default 0,
  status text not null default 'running',
  output_zip_path text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────

alter table public.users enable row level security;
alter table public.token_vouchers enable row level security;
alter table public.presets enable row level security;
alter table public.jobs enable row level security;
alter table public.batch_jobs enable row level security;

-- users: users can only see and edit their own row
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- token_vouchers: users cannot read or modify vouchers directly (server-side only)
-- no user-facing policies — all operations go through serverless functions with service role key

-- presets: users can manage their own presets
create policy "presets_select_own" on public.presets for select using (auth.uid() = user_id);
create policy "presets_insert_own" on public.presets for insert with check (auth.uid() = user_id);
create policy "presets_update_own" on public.presets for update using (auth.uid() = user_id);
create policy "presets_delete_own" on public.presets for delete using (auth.uid() = user_id);

-- jobs: users can see their own jobs and insert new ones
create policy "jobs_select_own" on public.jobs for select using (auth.uid() = user_id);
create policy "jobs_insert_own" on public.jobs for insert with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs for update using (auth.uid() = user_id);

-- batch_jobs: users can manage their own batch jobs
create policy "batch_jobs_select_own" on public.batch_jobs for select using (auth.uid() = user_id);
create policy "batch_jobs_insert_own" on public.batch_jobs for insert with check (auth.uid() = user_id);
create policy "batch_jobs_update_own" on public.batch_jobs for update using (auth.uid() = user_id);

-- ─────────────────────────────────────
-- TRIGGER: auto-create user profile on signup
-- ─────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, token_balance)
  values (new.id, new.email, 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────
-- FUNCTIONS: token deduction and refund
-- ─────────────────────────────────────

create or replace function public.deduct_tokens(
  p_user_id uuid,
  p_amount integer,
  p_job_id uuid,
  p_operation text
)
returns boolean as $$
declare
  current_balance integer;
begin
  select token_balance into current_balance
  from public.users
  where id = p_user_id
  for update;

  if current_balance < p_amount then
    raise exception 'Insufficient token balance';
  end if;

  update public.users
  set token_balance = token_balance - p_amount
  where id = p_user_id;

  return true;
end;
$$ language plpgsql security definer;

create or replace function public.refund_tokens(
  p_user_id uuid,
  p_amount integer
)
returns void as $$
begin
  update public.users
  set token_balance = token_balance + p_amount
  where id = p_user_id;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────

-- Run these in the Supabase dashboard Storage section, or via the API:
-- 1. Create bucket "inputs"   — private
-- 2. Create bucket "outputs"  — private
-- 3. Create bucket "backgrounds" — public
-- 4. Create bucket "thumbnails"  — private

-- ─────────────────────────────────────
-- STORAGE RLS POLICIES
-- Run this block in the Supabase SQL editor after creating the buckets.
-- Without these policies users will get "new row violates row level security"
-- when uploading images in the retouch panel.
-- ─────────────────────────────────────

-- inputs bucket: authenticated users can upload/read/delete their own files
create policy "inputs_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'inputs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "inputs_select_own" on storage.objects
  for select using (
    bucket_id = 'inputs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "inputs_update_own" on storage.objects
  for update using (
    bucket_id = 'inputs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "inputs_delete_own" on storage.objects
  for delete using (
    bucket_id = 'inputs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- outputs bucket: same pattern as inputs
create policy "outputs_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'outputs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "outputs_select_own" on storage.objects
  for select using (
    bucket_id = 'outputs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "outputs_update_own" on storage.objects
  for update using (
    bucket_id = 'outputs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "outputs_delete_own" on storage.objects
  for delete using (
    bucket_id = 'outputs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────
-- ADMIN PRESET EDITOR (run after initial setup)
-- ─────────────────────────────────────

create table if not exists public.system_presets (
  id uuid primary key default gen_random_uuid(),
  preset_key text unique not null,
  panel text not null default 'retouch',
  name text not null,
  icon text not null default '✨',
  description text not null default '',
  categories text[] not null default '{}',
  token_cost integer not null default 1,
  payload jsonb not null default '{}',
  before_image_url text,
  after_image_url text,
  status text not null default 'active' check (status in ('active', 'hidden')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_presets enable row level security;

-- Authenticated users can read active presets; admin API uses service role for all access
create policy "system_presets_read_active" on public.system_presets
  for select using (status = 'active' and auth.uid() is not null);
