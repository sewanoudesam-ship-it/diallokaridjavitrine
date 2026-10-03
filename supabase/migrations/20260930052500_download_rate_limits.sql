begin;

-- Store only HMACs of client IPs; no raw address or download code is persisted.
create table public.download_rate_limits (
  client_ip_hash text primary key check (client_ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0),
  updated_at timestamptz not null default now()
);

create index download_rate_limits_updated_at_idx
  on public.download_rate_limits(updated_at);

alter table public.download_rate_limits enable row level security;
revoke all on table public.download_rate_limits from public, anon, authenticated;
grant all on table public.download_rate_limits to service_role;

create function public.consume_download_rate_limit(p_client_ip_hash text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval := interval '15 minutes';
  v_max_attempts integer := 20;
  v_started_at timestamptz;
  v_attempt_count integer;
begin
  if p_client_ip_hash is null or p_client_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_RATE_LIMIT_KEY' using errcode = '22023';
  end if;

  -- Opportunistic purge bounds pseudonymous IP retention to one day.
  delete from public.download_rate_limits
  where updated_at < v_now - interval '24 hours';

  insert into public.download_rate_limits as bucket
    (client_ip_hash, window_started_at, attempt_count, updated_at)
  values (p_client_ip_hash, v_now, 1, v_now)
  on conflict (client_ip_hash) do update
  set window_started_at = case
        when bucket.window_started_at <= v_now - v_window then v_now
        else bucket.window_started_at
      end,
      attempt_count = case
        when bucket.window_started_at <= v_now - v_window then 1
        else bucket.attempt_count + 1
      end,
      updated_at = v_now
  returning bucket.window_started_at, bucket.attempt_count
  into v_started_at, v_attempt_count;

  return query
  select v_attempt_count <= v_max_attempts,
         case when v_attempt_count <= v_max_attempts then 0
              else greatest(1, ceil(extract(epoch from (v_started_at + v_window - v_now)))::integer)
         end;
end;
$$;

revoke all on function public.consume_download_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_download_rate_limit(text) to service_role;

commit;
