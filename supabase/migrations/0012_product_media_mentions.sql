-- Product-level media coverage managed by administrators.

create table if not exists public.product_media_mentions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_type text not null,
  source_name varchar(120) not null,
  title varchar(200),
  url text,
  published_on date,
  note varchar(300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_media_mentions_type_check
    check (media_type in ('instagram', 'youtube', 'x', 'magazine', 'web', 'other')),
  constraint product_media_mentions_source_check
    check (char_length(trim(source_name)) between 1 and 120),
  constraint product_media_mentions_url_check
    check (url is null or url ~ '^https://')
);

create index if not exists product_media_mentions_product_order_idx
  on public.product_media_mentions (product_id, published_on desc nulls last, sort_order, id);

create unique index if not exists product_media_mentions_product_url_unique
  on public.product_media_mentions (product_id, url)
  where url is not null;

alter table public.product_media_mentions enable row level security;

drop policy if exists "public product media mentions" on public.product_media_mentions;
create policy "public product media mentions"
on public.product_media_mentions for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.is_active
  )
);

drop policy if exists "admins manage product media mentions" on public.product_media_mentions;
create policy "admins manage product media mentions"
on public.product_media_mentions for all
using (public.is_admin())
with check (public.is_admin());

revoke all on public.product_media_mentions from anon, authenticated;
grant select on public.product_media_mentions to anon, authenticated;
grant all on public.product_media_mentions to service_role;
