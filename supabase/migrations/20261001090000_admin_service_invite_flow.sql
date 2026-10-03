begin;

revoke all on function public.validate_admin_access_code(text, text) from public, anon, authenticated;
grant execute on function public.validate_admin_access_code(text, text) to service_role;
drop function if exists public.hook_require_admin_access_code(jsonb);

create function public.consume_admin_access_code(p_code_hash text, p_email text, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user_email text;
  v_bootstrap public.admin_bootstrap%rowtype;
  v_invitation public.admin_invitations%rowtype;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$'
    or p_user_id is null
    or char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'ADMIN_ACCESS_INVALID';
  end if;

  select lower(u.email) into v_user_email
  from auth.users u
  where u.id = p_user_id
  for update;
  if v_user_email is null or v_user_email <> v_email then
    raise exception 'INVITED_USER_MISMATCH';
  end if;
  if exists (select 1 from public.user_roles r where r.user_id = p_user_id and r.role = 'admin') then
    raise exception 'ALREADY_ADMIN';
  end if;

  if not exists (select 1 from public.user_roles r where r.role = 'admin') then
    select * into v_bootstrap
    from public.admin_bootstrap b
    where b.singleton = true
    for update;
    if found
      and v_bootstrap.used_at is null
      and v_bootstrap.expires_at > now()
      and v_bootstrap.code_hash = p_code_hash then
      insert into public.user_roles(user_id, role, granted_by)
        values (p_user_id, 'admin', null);
      update public.admin_bootstrap
        set used_at = now(), used_by = p_user_id
        where singleton = true;
      return 'bootstrap';
    end if;
  end if;

  select * into v_invitation
  from public.admin_invitations i
  where i.code_hash = p_code_hash
    and i.invited_email = v_email
    and i.used_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  for update;
  if not found then
    raise exception 'ADMIN_ACCESS_INVALID';
  end if;

  insert into public.user_roles(user_id, role, granted_by)
    values (p_user_id, 'admin', v_invitation.created_by);
  update public.admin_invitations
    set used_at = now(), used_by = p_user_id
    where id = v_invitation.id;
  return 'invitation';
end;
$$;

revoke all on function public.consume_admin_access_code(text, text, uuid) from public, anon, authenticated;
grant execute on function public.consume_admin_access_code(text, text, uuid) to service_role;

commit;
