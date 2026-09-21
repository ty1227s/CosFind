-- CosFind consolidated Supabase schema
-- Generated from supabase/migrations/0001-0008 and the columns currently used by the application.
-- Target: a NEW, EMPTY Supabase project.
--
-- IMPORTANT:
--   Do not run this file against the existing CosFind database. The existing database
--   already contains these types, tables, policies, and triggers. Continue to use
--   incremental files in supabase/migrations for changes to an existing environment.
--   Supabase-provided auth and storage schemas are assumed to exist.

begin;

create extension if not exists pgcrypto;

create type public.profile_status as enum (
  'active',
  'suspended',
  'deleted'
);

create type public.stock_status as enum (
  'available',
  'low_stock',
  'sold_out',
  'unknown',
  'discontinued'
);

create type public.confirmation_method as enum (
  'store_visit',
  'staff_confirmation',
  'phone',
  'official_information'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique
    check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
  created_at timestamptz not null default now(),
  status public.profile_status not null default 'active',
  posting_suspended boolean not null default false,
  is_admin boolean not null default false
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_kana text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  name text not null,
  category text not null,
  additional_categories text[] not null default '{}',
  jan_code text,
  additional_jan_codes text[] not null default '{}',
  release_date date,
  spf integer,
  pa text check (pa is null or pa in ('+', '++', '+++', '++++')),
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  image_url text,
  unique (brand_id, name)
);

comment on column public.products.additional_categories is
  '主カテゴリ（category）に加えて商品へ設定する追加カテゴリ';
comment on column public.products.additional_jan_codes is
  '商品単位の追加JANコード。代表JANはjan_code、カラー別JANはproduct_variants.jan_codeに保存する。';
comment on column public.products.pa is
  'Optional Japanese UV protection grade: +, ++, +++, or ++++.';

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_name text not null,
  color_code text,
  jan_code text,
  release_date date,
  created_at timestamptz not null default now(),
  unique (product_id, variant_name)
);

comment on column public.product_variants.release_date is
  'Optional release date for this color or variation. Independent from products.release_date.';

create table public.store_chains (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  store_type text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chain_id uuid references public.store_chains(id),
  chain_name text,
  store_type text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  opening_date date,
  closing_date date,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint stores_operating_dates_order
    check (opening_date is null or closing_date is null or opening_date <= closing_date)
);

comment on column public.stores.opening_date is
  'First date on which the store is visible publicly (inclusive, Asia/Tokyo).';
comment on column public.stores.closing_date is
  'First date on which the store is hidden publicly (exclusive, Asia/Tokyo).';

create table public.stock_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  product_variant_id uuid references public.product_variants(id),
  store_id uuid not null references public.stores(id),
  user_id uuid not null references public.profiles(id),
  status public.stock_status not null default 'available',
  confirmation_method public.confirmation_method not null,
  comment varchar(200),
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.product_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  payload jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint product_requests_payload_object
    check (jsonb_typeof(payload) = 'object'),
  constraint product_requests_payload_size
    check (octet_length(payload::text) <= 20000),
  constraint product_requests_status_allowed
    check (status in ('pending', 'approved', 'rejected'))
);

create table public.store_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  payload jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint store_requests_payload_object
    check (jsonb_typeof(payload) = 'object'),
  constraint store_requests_payload_size
    check (octet_length(payload::text) <= 20000),
  constraint store_requests_status_allowed
    check (status in ('pending', 'approved', 'rejected', 'metadata'))
);

create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  stock_report_id uuid references public.stock_reports(id),
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint abuse_reports_reason_size
    check (char_length(reason) between 1 and 1000),
  constraint abuse_reports_status_allowed
    check (status in ('open', 'reviewing', 'resolved', 'rejected'))
);

create table public.api_rate_limits (
  key text primary key,
  request_count integer not null,
  window_started_at timestamptz not null
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title varchar(120) not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_published boolean not null default true,
  constraint announcements_title_not_blank
    check (char_length(trim(title)) between 1 and 120),
  constraint announcements_body_not_blank
    check (char_length(trim(body)) between 1 and 20000)
);

create index stock_reports_lookup
  on public.stock_reports (product_id, store_id, reported_at desc);
create index products_additional_categories_gin_idx
  on public.products using gin (additional_categories);
create index products_additional_jan_codes_gin_idx
  on public.products using gin (additional_jan_codes);
create index announcements_publication_order
  on public.announcements (published_at desc)
  where is_published;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
begin
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    requested_username := null;
  end if;

  insert into public.profiles (id, username)
  values (new.id, requested_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  )
$$;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  insert into public.api_rate_limits (key, request_count, window_started_at)
  values (p_key, 1, now())
  on conflict (key) do update set
    request_count = case
      when public.api_rate_limits.window_started_at
        + make_interval(secs => p_window_seconds) <= now() then 1
      else public.api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.api_rate_limits.window_started_at
        + make_interval(secs => p_window_seconds) <= now() then now()
      else public.api_rate_limits.window_started_at
    end
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

create view public.public_stock_summaries
with (security_invoker = false)
as
select
  sr.product_id,
  sr.store_id,
  max(sr.reported_at) as last_reported_at,
  array_agg(distinct pv.variant_name)
    filter (where pv.variant_name is not null) as confirmed_variants,
  count(*) as report_count
from public.stock_reports sr
left join public.product_variants pv on pv.id = sr.product_variant_id
where sr.status = 'available'
group by sr.product_id, sr.store_id;

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.store_chains enable row level security;
alter table public.stores enable row level security;
alter table public.stock_reports enable row level security;
alter table public.product_requests enable row level security;
alter table public.store_requests enable row level security;
alter table public.abuse_reports enable row level security;
alter table public.api_rate_limits enable row level security;
alter table public.announcements enable row level security;

create policy "public catalog brands"
on public.brands for select
using (true);

create policy "public catalog products"
on public.products for select
using (is_active);

create policy "public catalog variants"
on public.product_variants for select
using (true);

create policy "public active chains"
on public.store_chains for select
using (is_active);

create policy "public active stores"
on public.stores for select
using (
  is_active
  and (opening_date is null or opening_date <= (now() at time zone 'Asia/Tokyo')::date)
  and (closing_date is null or closing_date > (now() at time zone 'Asia/Tokyo')::date)
);

create policy "own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "admins read profiles"
on public.profiles for select
using (public.is_admin());

create policy "insert own reports"
on public.stock_reports for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and not p.posting_suspended
  )
);

create policy "read own reports"
on public.stock_reports for select
using (auth.uid() = user_id);

create policy "admins manage reports"
on public.stock_reports for all
using (public.is_admin());

create policy "read own product requests"
on public.product_requests for select
using (auth.uid() = user_id);

create policy "insert own product requests"
on public.product_requests for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and not p.posting_suspended
  )
);

create policy "read own store requests"
on public.store_requests for select
using (auth.uid() = user_id);

create policy "insert own store requests"
on public.store_requests for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and not p.posting_suspended
  )
);

create policy "read own abuse reports"
on public.abuse_reports for select
using (auth.uid() = reporter_id);

create policy "insert own abuse reports"
on public.abuse_reports for insert
with check (auth.uid() = reporter_id and status = 'open');

create policy "admins manage chains"
on public.store_chains for all
using (public.is_admin())
with check (public.is_admin());

create policy "public published announcements"
on public.announcements for select
using (is_published and published_at <= now());

revoke all on public.profiles from anon, authenticated;
revoke all on public.brands from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.product_variants from anon, authenticated;
revoke all on public.store_chains from anon, authenticated;
revoke all on public.stores from anon, authenticated;
revoke all on public.stock_reports from anon, authenticated;
revoke all on public.product_requests from anon, authenticated;
revoke all on public.store_requests from anon, authenticated;
revoke all on public.abuse_reports from anon, authenticated;
revoke all on public.api_rate_limits from anon, authenticated;
revoke all on public.announcements from anon, authenticated;

grant select on public.brands to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant select on public.store_chains to anon, authenticated;
grant select on public.stores to anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant select on public.public_stock_summaries to anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert on public.stock_reports to authenticated;
grant select, insert on public.product_requests to authenticated;
grant select, insert on public.store_requests to authenticated;
grant select, insert on public.abuse_reports to authenticated;

grant all on public.profiles to service_role;
grant all on public.brands to service_role;
grant all on public.products to service_role;
grant all on public.product_variants to service_role;
grant all on public.store_chains to service_role;
grant all on public.stores to service_role;
grant all on public.stock_reports to service_role;
grant all on public.product_requests to service_role;
grant all on public.store_requests to service_role;
grant all on public.abuse_reports to service_role;
grant all on public.api_rate_limits to service_role;
grant all on public.announcements to service_role;
grant select on public.public_stock_summaries to service_role;

revoke all on function public.handle_new_user() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;

-- Profile HN, avatar choice, avatar URL, and favorite IDs are stored in
-- auth.users.raw_user_meta_data by Supabase Auth, not in public tables.
-- The application also creates this public bucket lazily on first avatar upload;
-- defining it here makes a new project ready immediately.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
