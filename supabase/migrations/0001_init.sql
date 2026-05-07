-- El Taller — multi-tenant content studio schema
-- All tenant data is scoped via the `client_id` foreign key.
-- RLS policies use `public.current_client_id()` to enforce tenant isolation.

-- =============================================================================
-- TENANTS
-- =============================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  domain text unique,
  plan_tier text not null default 'beta',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.clients.domain is
  'Custom domain for this tenant, e.g. studio.beboutiquepr.com. Null = path-based access only.';
comment on column public.clients.plan_tier is
  'beta | starter | growth — drives feature gating and usage caps.';

-- =============================================================================
-- BRAND BRIEF (1:1 with client)
-- =============================================================================

create table public.brand_briefs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  voice text,
  audience text,
  products text,
  do_dont text,
  sample_captions text,
  visual_style text,
  primary_color text,
  secondary_color text,
  logo_url text,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- USER PROFILES (link Supabase auth users → tenant)
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create index profiles_client_idx on public.profiles (client_id);

-- =============================================================================
-- CONTENT ITEMS (the calendar entries)
-- =============================================================================

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  scheduled_date date not null,
  type text not null check (type in ('reel', 'carousel', 'static')),
  idea text,
  photo_url text,
  output jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_items_client_date_idx
  on public.content_items (client_id, scheduled_date desc);

-- =============================================================================
-- USAGE LOGS (Anthropic API tracking per tenant)
-- =============================================================================

create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  endpoint text not null,
  model text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10, 6),
  created_at timestamptz not null default now()
);

create index usage_logs_client_idx
  on public.usage_logs (client_id, created_at desc);

-- =============================================================================
-- RLS HELPER: get client_id for the currently-authenticated user
-- =============================================================================

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid()
$$;

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================

alter table public.clients        enable row level security;
alter table public.brand_briefs   enable row level security;
alter table public.profiles       enable row level security;
alter table public.content_items  enable row level security;
alter table public.usage_logs     enable row level security;

-- Profiles: user reads/updates own row only
create policy "profile self read"
  on public.profiles for select using (id = auth.uid());
create policy "profile self update"
  on public.profiles for update using (id = auth.uid());

-- Clients: user reads own tenant
create policy "client self read"
  on public.clients for select using (id = public.current_client_id());

-- Brand brief: read + write for own tenant
create policy "brand brief tenant read"
  on public.brand_briefs for select using (client_id = public.current_client_id());
create policy "brand brief tenant write"
  on public.brand_briefs for all
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

-- Content items: full CRUD for own tenant
create policy "content tenant crud"
  on public.content_items for all
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

-- Usage logs: read-only for own tenant (writes go through service role)
create policy "usage tenant read"
  on public.usage_logs for select using (client_id = public.current_client_id());

-- =============================================================================
-- STORAGE: content-photos bucket, scoped per tenant
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('content-photos', 'content-photos', false)
on conflict (id) do nothing;

create policy "photos upload to own client folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'content-photos'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );

create policy "photos read own client folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'content-photos'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );

create policy "photos delete own client folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'content-photos'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );
