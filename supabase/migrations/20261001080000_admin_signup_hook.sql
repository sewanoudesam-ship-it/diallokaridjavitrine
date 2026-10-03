begin;

create function public.hook_require_admin_access_code(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(event->'user'->>'email', '')));
  v_code_hash text := event->'user'->'user_metadata'->>'admin_access_code_hash';
begin
  if event->'user'->>'is_anonymous' = 'true'
    or v_code_hash is null
    or v_code_hash !~ '^[0-9a-f]{64}$'
    or char_length(v_email) not between 3 and 254 then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'A valid administrator access code is required.'
    ));
  end if;

  if not exists (select 1 from public.user_roles r where r.role = 'admin')
    and exists (
      select 1 from public.admin_bootstrap b
      where b.singleton = true
        and b.code_hash = v_code_hash
        and b.used_at is null
        and b.expires_at > now()
    ) then
    return '{}'::jsonb;
  end if;

  if exists (
    select 1 from public.admin_invitations i
    where i.code_hash = v_code_hash
      and i.invited_email = v_email
      and i.used_at is null
      and i.revoked_at is null
      and i.expires_at > now()
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'A valid administrator access code is required.'
  ));
end;
$$;

revoke all on function public.hook_require_admin_access_code(jsonb) from public, anon, authenticated;
grant execute on function public.hook_require_admin_access_code(jsonb) to supabase_auth_admin;

commit;
