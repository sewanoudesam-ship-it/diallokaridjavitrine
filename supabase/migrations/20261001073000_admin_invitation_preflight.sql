begin;

create function public.validate_admin_access_code(p_code_hash text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$'
    or char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return false;
  end if;

  if not exists (select 1 from public.user_roles r where r.role = 'admin')
    and exists (
      select 1 from public.admin_bootstrap b
      where b.singleton = true and b.code_hash = p_code_hash
        and b.used_at is null and b.expires_at > now()
    ) then
    return true;
  end if;

  return exists (
    select 1 from public.admin_invitations i
    where i.code_hash = p_code_hash
      and i.invited_email = v_email
      and i.used_at is null
      and i.revoked_at is null
      and i.expires_at > now()
  );
end;
$$;

revoke all on function public.validate_admin_access_code(text, text) from public;
grant execute on function public.validate_admin_access_code(text, text) to anon, authenticated;

commit;
