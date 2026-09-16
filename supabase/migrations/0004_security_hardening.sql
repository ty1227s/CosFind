-- Public-release security hardening. Apply this migration before deployment.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
begin
  if requested_username !~ '^[a-z0-9_]{3,24}$' then requested_username := null; end if;
  insert into public.profiles(id, username)
  values(new.id, requested_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.product_requests
  add constraint product_requests_payload_object check (jsonb_typeof(payload) = 'object') not valid,
  add constraint product_requests_payload_size check (octet_length(payload::text) <= 20000) not valid,
  add constraint product_requests_status_allowed check (status in ('pending', 'approved', 'rejected')) not valid;
alter table public.store_requests
  add constraint store_requests_payload_object check (jsonb_typeof(payload) = 'object') not valid,
  add constraint store_requests_payload_size check (octet_length(payload::text) <= 20000) not valid,
  add constraint store_requests_status_allowed check (status in ('pending', 'approved', 'rejected', 'metadata')) not valid;
alter table public.abuse_reports
  add constraint abuse_reports_reason_size check (char_length(reason) between 1 and 1000) not valid,
  add constraint abuse_reports_status_allowed check (status in ('open', 'reviewing', 'resolved', 'rejected')) not valid;

drop policy if exists "own product requests" on public.product_requests;
drop policy if exists "own store requests" on public.store_requests;
drop policy if exists "own abuse reports" on public.abuse_reports;

create policy "read own product requests" on public.product_requests
  for select using (auth.uid() = user_id);
create policy "insert own product requests" on public.product_requests
  for insert with check (
    auth.uid() = user_id and status = 'pending' and
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and not p.posting_suspended)
  );
create policy "read own store requests" on public.store_requests
  for select using (auth.uid() = user_id);
create policy "insert own store requests" on public.store_requests
  for insert with check (
    auth.uid() = user_id and status = 'pending' and
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and not p.posting_suspended)
  );
create policy "read own abuse reports" on public.abuse_reports
  for select using (auth.uid() = reporter_id);
create policy "insert own abuse reports" on public.abuse_reports
  for insert with check (auth.uid() = reporter_id and status = 'open');

revoke update, delete on public.product_requests from authenticated;
revoke update, delete on public.store_requests from authenticated;
revoke update, delete on public.abuse_reports from authenticated;

create table if not exists public.api_rate_limits(
  key text primary key,
  request_count integer not null,
  window_started_at timestamptz not null
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.consume_api_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  insert into public.api_rate_limits(key, request_count, window_started_at)
  values(p_key, 1, now())
  on conflict (key) do update set
    request_count = case
      when public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= now() then 1
      else public.api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= now() then now()
      else public.api_rate_limits.window_started_at
    end
  returning request_count <= p_limit into allowed;
  return allowed;
end;
$$;
revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
