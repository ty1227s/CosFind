-- Store publication period. opening_date is inclusive; closing_date is exclusive.

alter table public.stores
  add column if not exists opening_date date,
  add column if not exists closing_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stores_operating_dates_order'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_operating_dates_order
      check (opening_date is null or closing_date is null or opening_date <= closing_date);
  end if;
end
$$;

drop policy if exists "public active stores" on public.stores;
create policy "public active stores" on public.stores
  for select using (
    is_active
    and (opening_date is null or opening_date <= (now() at time zone 'Asia/Tokyo')::date)
    and (closing_date is null or closing_date > (now() at time zone 'Asia/Tokyo')::date)
  );
