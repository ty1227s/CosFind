-- Reduces Cloudflare Worker CPU by returning only the latest catalog metadata
-- snapshot for each logical entity instead of the append-only history.

create index if not exists store_requests_status_created_idx
  on public.store_requests(status, created_at desc);
create index if not exists store_requests_user_status_idx
  on public.store_requests(user_id, status);
create index if not exists store_requests_metadata_type_idx
  on public.store_requests((payload->>'metadataType'), created_at desc)
  where status = 'metadata';
create index if not exists store_requests_store_metadata_idx
  on public.store_requests((payload->>'storeId'), created_at desc)
  where status = 'metadata';
create index if not exists store_requests_station_metadata_idx
  on public.store_requests((payload->>'stationName'), created_at desc)
  where status = 'metadata' and payload->>'metadataType' = 'station_directory';
create index if not exists store_requests_line_metadata_idx
  on public.store_requests((payload->>'lineName'), created_at desc)
  where status = 'metadata' and payload->>'metadataType' = 'railway_line_directory';
create index if not exists stock_reports_user_idx on public.stock_reports(user_id);
create index if not exists product_requests_user_idx on public.product_requests(user_id);

create or replace function public.catalog_metadata_latest(requested_types text[], requested_keys text[] default null)
returns table(user_id uuid, payload jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      sr.user_id,
      sr.payload,
      sr.created_at,
      coalesce(sr.payload->>'metadataType', case when sr.payload ? 'storeId' then 'store_provisional_brands' end) as metadata_type,
      case coalesce(sr.payload->>'metadataType', case when sr.payload ? 'storeId' then 'store_provisional_brands' end)
        when 'station_directory' then sr.payload->>'stationName'
        when 'railway_line_directory' then sr.payload->>'lineName'
        when 'railway_company_directory' then sr.payload->>'companyName'
        when 'store_provisional_brands' then sr.payload->>'storeId'
        else null
      end as entity_key,
      sr.id
    from public.store_requests sr
    where sr.status = 'metadata'
  ), latest as (
    select distinct on (metadata_type, entity_key)
      user_id, payload, created_at
    from normalized
    where metadata_type = any(requested_types)
      and entity_key is not null
      and (requested_keys is null or entity_key = any(requested_keys))
    order by metadata_type, entity_key, created_at desc, id desc
  )
  select latest.user_id, latest.payload, latest.created_at
  from latest;
$$;

revoke all on function public.catalog_metadata_latest(text[], text[]) from public, anon, authenticated;
grant execute on function public.catalog_metadata_latest(text[], text[]) to service_role;

create or replace function public.admin_user_activity()
returns table(user_id uuid, stock_reports bigint, product_requests bigint, store_requests bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    (select count(*) from public.stock_reports sr where sr.user_id = p.id),
    (select count(*) from public.product_requests pr where pr.user_id = p.id),
    (select count(*) from public.store_requests str
      where str.user_id = p.id
        and (str.status <> 'metadata' or str.payload->>'metadataType' = 'store_brand_report'))
  from public.profiles p;
$$;

revoke all on function public.admin_user_activity() from public, anon, authenticated;
grant execute on function public.admin_user_activity() to service_role;
