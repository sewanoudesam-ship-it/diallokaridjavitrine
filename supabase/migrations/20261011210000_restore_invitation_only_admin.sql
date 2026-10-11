begin;

-- Security fix: an email confirmation alone must never grant the admin role.
-- Admin accounts are created only through the service-side invitation flow,
-- which validates a one-time bootstrap/invitation code and the invited email.
drop trigger if exists auth_users_grant_admin_after_email_confirmation on auth.users;
drop function if exists public.grant_admin_role_after_email_confirmation();

-- The Auth hook is intentionally absent: request-admin-access uses the
-- service role and finalizes the one-time code atomically via
-- consume_admin_access_code(). Direct public signUp() never grants admin.
create or replace function public.hook_require_admin_access_code(event jsonb)
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
      where b.singleton = true and b.code_hash = v_code_hash
        and b.used_at is null and b.expires_at > now()
    ) then
    return '{}'::jsonb;
  end if;

  if exists (
    select 1 from public.admin_invitations i
    where i.code_hash = v_code_hash and i.invited_email = v_email
      and i.used_at is null and i.revoked_at is null and i.expires_at > now()
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
