begin;

-- The requested onboarding flow is email-confirmation based: the form collects
-- identity details, Supabase sends the confirmation link, and the admin role is
-- granted only when Auth records email_confirmed_at.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

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

create or replace function public.grant_admin_role_after_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_first_name text := left(btrim(coalesce(new.raw_user_meta_data->>'first_name', '')), 80);
  v_last_name text := left(btrim(coalesce(new.raw_user_meta_data->>'last_name', '')), 80);
  v_display_name text := left(nullif(btrim(concat_ws(' ', v_first_name, v_last_name)), ''), 120);
begin
  if v_display_name is null then
    v_display_name := left(coalesce(new.email, 'Administrateur'), 120);
  end if;

  insert into public.user_roles(user_id, role, granted_by)
  values (new.id, 'admin', null)
  on conflict (user_id) do nothing;

  insert into public.profiles(user_id, display_name, first_name, last_name)
  values (new.id, v_display_name, nullif(v_first_name, ''), nullif(v_last_name, ''))
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name;

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
