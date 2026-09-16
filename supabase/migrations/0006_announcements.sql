-- Public announcements managed from the CosFind admin area.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title varchar(120) not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_published boolean not null default true,
  constraint announcements_title_not_blank check (char_length(trim(title)) between 1 and 120),
  constraint announcements_body_not_blank check (char_length(trim(body)) between 1 and 20000)
);

create index if not exists announcements_publication_order
  on public.announcements (published_at desc)
  where is_published;

alter table public.announcements enable row level security;

drop policy if exists "public published announcements" on public.announcements;
create policy "public published announcements" on public.announcements
  for select using (is_published and published_at <= now());

revoke insert, update, delete on public.announcements from anon, authenticated;
grant select on public.announcements to anon, authenticated;
