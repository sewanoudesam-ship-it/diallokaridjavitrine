begin;

create table public.admin_bootstrap (
  singleton boolean primary key default true check (singleton),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  invited_email text not null check (invited_email = lower(btrim(invited_email)) and char_length(invited_email) between 3 and 254),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);
create index admin_invitations_email_active_idx
  on public.admin_invitations(invited_email, expires_at)
  where used_at is null and revoked_at is null;

alter table public.admin_bootstrap enable row level security;
alter table public.admin_invitations enable row level security;
revoke all on public.admin_bootstrap, public.admin_invitations from public, anon, authenticated;
grant all on public.admin_bootstrap, public.admin_invitations to service_role;

create function public.create_admin_invitation(p_email text, p_code_hash text)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_expires_at timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVITATION_CODE_INVALID';
  end if;
  if char_length(v_email) not between 3 and 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVITATION_EMAIL_INVALID';
  end if;
  if exists (
    select 1 from auth.users u
    join public.user_roles r on r.user_id = u.id
    where lower(u.email) = v_email and r.role = 'admin'
  ) then
    raise exception 'ALREADY_ADMIN';
  end if;

  update public.admin_invitations
    set revoked_at = now()
    where invited_email = v_email and used_at is null and revoked_at is null;

  insert into public.admin_invitations(code_hash, invited_email, created_by)
    values (p_code_hash, v_email, auth.uid())
    returning expires_at into v_expires_at;
  return v_expires_at;
end;
$$;

create function public.claim_admin_access(p_code_hash text)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_bootstrap public.admin_bootstrap%rowtype;
  v_invitation public.admin_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVITATION_INVALID';
  end if;
  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_user_id and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception 'EMAIL_CONFIRMATION_REQUIRED';
  end if;
  if exists (select 1 from public.user_roles r where r.user_id = v_user_id and r.role = 'admin') then
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
        values (v_user_id, 'admin', null);
      update public.admin_bootstrap
        set used_at = now(), used_by = v_user_id
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
    raise exception 'INVITATION_INVALID';
  end if;

  insert into public.user_roles(user_id, role, granted_by)
    values (v_user_id, 'admin', v_invitation.created_by);
  update public.admin_invitations
    set used_at = now(), used_by = v_user_id
    where id = v_invitation.id;
  return 'invitation';
end;
$$;

revoke all on function public.create_admin_invitation(text, text) from public, anon;
revoke all on function public.claim_admin_access(text) from public, anon;
grant execute on function public.create_admin_invitation(text, text) to authenticated;
grant execute on function public.claim_admin_access(text) to authenticated;

insert into public.admin_bootstrap(singleton, code_hash, expires_at)
values (true, '90dec52be05b7bf1865334b6910c6589ecbf6f4d3366d09e6daab908418bce23', now() + interval '30 days')
on conflict (singleton) do nothing;

commit;
