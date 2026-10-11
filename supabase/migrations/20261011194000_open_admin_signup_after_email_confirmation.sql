begin;

-- Keep the configured Supabase Auth hook name, but remove the invitation-code gate.
-- Email-only signups are allowed; anonymous sign-ins remain rejected.
create or replace function public.hook_require_admin_access_code(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(event->'user'->>'email', '')));
begin
  if event->'user'->>'is_anonymous' = 'true'
    or char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'A valid email address is required.'
    ));
  end if;

  return '{}'::jsonb;
end;
$$;

revoke all on function public.hook_require_admin_access_code(jsonb) from public, anon, authenticated;
grant execute on function public.hook_require_admin_access_code(jsonb) to supabase_auth_admin;

-- Roles are granted only when Auth changes a previously unconfirmed account to
-- email-confirmed. An account inserted as already confirmed is deliberately not
-- promoted, so a disabled email-confirmation setting cannot silently grant admin.
create or replace function public.grant_admin_role_after_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.user_roles(user_id, role, granted_by)
  values (new.id, 'admin', null)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.grant_admin_role_after_email_confirmation() from public, anon, authenticated;

drop trigger if exists auth_users_grant_admin_after_email_confirmation on auth.users;
create trigger auth_users_grant_admin_after_email_confirmation
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_admin_role_after_email_confirmation();

commit;
