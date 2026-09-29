begin;

create type public.publication_status as enum ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');
create type public.order_type as enum ('BOOK', 'JEWELRY');
create type public.payment_status as enum ('PENDING', 'PAID', 'REJECTED', 'REFUNDED');
create type public.order_status as enum ('OPEN', 'COMPLETED', 'CANCELLED');

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  author text not null check (char_length(author) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  excerpt text,
  price_amount numeric(12,2) not null check (price_amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  cover_path text,
  original_pdf_path text,
  status public.publication_status not null default 'DRAFT',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (cover_path is null or (cover_path !~ '(^/|(^|/)\.\.(/|$))')),
  check (original_pdf_path is null or (original_pdf_path !~ '(^/|(^|/)\.\.(/|$))')),
  check (status <> 'PUBLISHED' or original_pdf_path is not null)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  category text,
  price_amount numeric(12,2) not null check (price_amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.publication_status not null default 'DRAFT',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  storage_path text not null unique check (storage_path !~ '(^/|(^|/)\.\.(/|$))'),
  alt_text text not null check (char_length(alt_text) between 1 and 240),
  position integer not null default 0 check (position >= 0),
  is_primary boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index product_images_one_primary_per_product on public.product_images(product_id) where is_primary;

create table public.site_settings (
  singleton boolean primary key default true check (singleton),
  admin_whatsapp_e164 text check (admin_whatsapp_e164 is null or admin_whatsapp_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  payment_instructions text,
  support_email text,
  legal_entity_name text,
  business_address text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'MK-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  order_type public.order_type not null,
  book_id uuid references public.books(id) on delete restrict,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  country_iso text not null check (country_iso ~ '^[A-Z]{2}$'),
  email text check (email is null or char_length(email) <= 254),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  payment_status public.payment_status not null default 'PENDING',
  status public.order_status not null default 'OPEN',
  paid_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((order_type = 'BOOK' and book_id is not null) or (order_type = 'JEWELRY' and book_id is null)),
  check ((payment_status = 'PAID' and paid_at is not null and paid_by is not null) or payment_status <> 'PAID')
);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_payment_status_idx on public.orders(payment_status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  item_type public.order_type not null,
  book_id uuid references public.books(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  item_name_snapshot text not null check (char_length(item_name_snapshot) between 1 and 200),
  quantity integer not null check (quantity between 1 and 99),
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  currency_snapshot text not null check (currency_snapshot ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  check ((item_type = 'BOOK' and book_id is not null and product_id is null) or (item_type = 'JEWELRY' and product_id is not null and book_id is null))
);
create index order_items_order_idx on public.order_items(order_id);

create table public.digital_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  access_code_hash text not null unique check (char_length(access_code_hash) between 32 and 128),
  access_code_ciphertext text not null,
  access_token_hash text not null unique check (char_length(access_token_hash) between 32 and 128),
  access_token_ciphertext text not null,
  pdf_storage_path text not null check (pdf_storage_path !~ '(^/|(^|/)\.\.(/|$))'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.download_access (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null unique references public.digital_deliveries(id) on delete restrict,
  downloaded_count integer not null default 0 check (downloaded_count between 0 and 2),
  max_downloads integer not null default 2 check (max_downloads = 2),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_download_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  recipient_e164 text not null check (recipient_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  prepared_by uuid not null references auth.users(id) on delete restrict,
  prepared_at timestamptz not null default now(),
  sent_by uuid references auth.users(id) on delete restrict,
  sent_at timestamptz,
  check ((sent_by is null and sent_at is null) or (sent_by is not null and sent_at is not null))
);
create index whatsapp_messages_order_idx on public.whatsapp_messages(order_id, prepared_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger books_set_updated_at before update on public.books for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

create function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  );
$$;

-- Public views expose only published copy and public settings, never private PDF paths,
-- order data, payment instructions, codes, tokens, or audit records.
create view public.published_products with (security_barrier = true) as
select p.id, p.name, p.slug, p.description, p.price_amount, p.currency, p.category,
       p.status, i.storage_path as image_path
from public.products p
left join lateral (
  select pi.storage_path from public.product_images pi
  where pi.product_id = p.id and pi.is_primary = true
  order by pi.created_at desc limit 1
) i on true
where p.status = 'PUBLISHED';

create view public.published_books with (security_barrier = true) as
select b.id, b.title, b.author, b.slug, b.description, b.price_amount, b.currency,
       b.excerpt, b.status, b.cover_path
from public.books b
where b.status = 'PUBLISHED';

create view public.public_site_settings with (security_barrier = true) as
select s.admin_whatsapp_e164, s.support_email, s.legal_entity_name, s.business_address
from public.site_settings s
where s.singleton = true;

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.digital_deliveries enable row level security;
alter table public.download_access enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.audit_logs enable row level security;

create policy user_roles_read_self_or_admin on public.user_roles for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());
create policy profiles_admin_all on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy books_admin_all on public.books for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy products_admin_all on public.products for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy product_images_admin_all on public.product_images for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy site_settings_admin_all on public.site_settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_read on public.orders for select to authenticated
using (public.is_admin());
create policy order_items_admin_read on public.order_items for select to authenticated
using (public.is_admin());
create policy deliveries_admin_read on public.digital_deliveries for select to authenticated
using (public.is_admin());
create policy download_access_admin_read on public.download_access for select to authenticated
using (public.is_admin());
create policy whatsapp_messages_admin_read on public.whatsapp_messages for select to authenticated
using (public.is_admin());
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
using (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.published_products, public.published_books, public.public_site_settings to anon, authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.profiles, public.books, public.products, public.product_images, public.site_settings to authenticated;
grant select on public.orders, public.order_items, public.digital_deliveries, public.download_access, public.whatsapp_messages, public.audit_logs to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- The customer only sees uploaded public images. Private book files are available solely
-- through trusted Edge Functions and short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('book-originals', 'book-originals', false, 52428800, array['application/pdf']),
  ('book-personalized', 'book-personalized', false, 52428800, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy public_assets_read on storage.objects for select to anon, authenticated
using (bucket_id = 'public-assets');
create policy public_assets_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'public-assets' and public.is_admin());
create policy public_assets_admin_update on storage.objects for update to authenticated
using (bucket_id = 'public-assets' and public.is_admin())
with check (bucket_id = 'public-assets' and public.is_admin());
create policy public_assets_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'public-assets' and public.is_admin());
create policy private_book_admin_read on storage.objects for select to authenticated
using (bucket_id in ('book-originals', 'book-personalized') and public.is_admin());
create policy private_book_admin_insert on storage.objects for insert to authenticated
with check (bucket_id in ('book-originals', 'book-personalized') and public.is_admin());
create policy private_book_admin_update on storage.objects for update to authenticated
using (bucket_id in ('book-originals', 'book-personalized') and public.is_admin())
with check (bucket_id in ('book-originals', 'book-personalized') and public.is_admin());
create policy private_book_admin_delete on storage.objects for delete to authenticated
using (bucket_id in ('book-originals', 'book-personalized') and public.is_admin());

create function public.confirm_book_payment_and_create_access(
  p_order_id uuid,
  p_actor_id uuid,
  p_code_hash text,
  p_code_ciphertext text,
  p_token_hash text,
  p_token_ciphertext text,
  p_pdf_storage_path text,
  p_expires_at timestamptz default null
)
returns table (delivery_id uuid, order_number text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order public.orders%rowtype;
  v_delivery_id uuid;
begin
  if not exists (select 1 from public.user_roles r where r.user_id = p_actor_id and r.role = 'admin') then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id and order_type = 'BOOK' for update;
  if not found then raise exception 'BOOK_ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_order.payment_status <> 'PENDING' or v_order.status = 'CANCELLED' then
    raise exception 'ORDER_NOT_PENDING' using errcode = '23514';
  end if;
  if exists (select 1 from public.digital_deliveries d where d.order_id = p_order_id) then
    raise exception 'DELIVERY_ALREADY_CREATED' using errcode = '23505';
  end if;
  insert into public.digital_deliveries(order_id, access_code_hash, access_code_ciphertext, access_token_hash, access_token_ciphertext, pdf_storage_path, created_by)
  values (p_order_id, p_code_hash, p_code_ciphertext, p_token_hash, p_token_ciphertext, p_pdf_storage_path, p_actor_id)
  returning id into v_delivery_id;
  insert into public.download_access(delivery_id, max_downloads, expires_at)
  values (v_delivery_id, 2, p_expires_at);
  update public.orders set payment_status = 'PAID', paid_at = now(), paid_by = p_actor_id where id = p_order_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'BOOK_PAYMENT_CONFIRMED', 'order', p_order_id, jsonb_build_object('delivery_id', v_delivery_id));
  return query select v_delivery_id, v_order.order_number;
end;
$$;

create function public.record_whatsapp_prepared(p_order_id uuid, p_actor_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order public.orders%rowtype;
  v_message_id uuid;
begin
  if not exists (select 1 from public.user_roles r where r.user_id = p_actor_id and r.role = 'admin') then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id for share;
  if not found or v_order.order_type <> 'BOOK' or v_order.payment_status <> 'PAID' then
    raise exception 'PAID_BOOK_ORDER_REQUIRED' using errcode = '23514';
  end if;
  if not exists (select 1 from public.digital_deliveries d join public.download_access a on a.delivery_id = d.id where d.order_id = p_order_id and d.revoked_at is null and a.revoked_at is null) then
    raise exception 'ACTIVE_DELIVERY_REQUIRED' using errcode = '23514';
  end if;
  insert into public.whatsapp_messages(order_id, recipient_e164, prepared_by)
  values (p_order_id, v_order.phone_e164, p_actor_id)
  returning id into v_message_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'WHATSAPP_MESSAGE_PREPARED', 'order', p_order_id, jsonb_build_object('message_id', v_message_id));
  return v_message_id;
end;
$$;

create function public.mark_whatsapp_message_sent(p_message_id uuid, p_actor_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order_id uuid;
begin
  if not exists (select 1 from public.user_roles r where r.user_id = p_actor_id and r.role = 'admin') then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  update public.whatsapp_messages
  set sent_by = p_actor_id, sent_at = now()
  where id = p_message_id and sent_by is null and sent_at is null
  returning order_id into v_order_id;
  if v_order_id is null then return false; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'WHATSAPP_MESSAGE_MARKED_SENT', 'order', v_order_id, jsonb_build_object('message_id', p_message_id));
  return true;
end;
$$;

create function public.consume_download_access(p_access_id uuid)
returns table (allowed boolean, pdf_storage_path text, download_number integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_access public.download_access%rowtype;
  v_delivery public.digital_deliveries%rowtype;
  v_order_id uuid;
  v_count integer;
begin
  select * into v_access from public.download_access where id = p_access_id for update;
  if not found then return query select false, null::text, 0; return; end if;
  select * into v_delivery from public.digital_deliveries where id = v_access.delivery_id;
  if not found or v_delivery.revoked_at is not null or v_access.revoked_at is not null or (v_access.expires_at is not null and v_access.expires_at <= now()) then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
    values (null, 'DOWNLOAD_DENIED', 'delivery', v_access.delivery_id, jsonb_build_object('reason', 'inactive'));
    return query select false, null::text, v_access.downloaded_count;
    return;
  end if;
  select o.id into v_order_id from public.orders o where o.id = v_delivery.order_id and o.payment_status = 'PAID' and o.order_type = 'BOOK';
  if v_order_id is null or v_access.downloaded_count >= v_access.max_downloads then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
    values (null, 'DOWNLOAD_DENIED', 'delivery', v_access.delivery_id, jsonb_build_object('reason', case when v_order_id is null then 'unpaid' else 'limit' end));
    return query select false, null::text, v_access.downloaded_count;
    return;
  end if;
  update public.download_access
  set downloaded_count = downloaded_count + 1, last_download_at = now()
  where id = p_access_id
  returning downloaded_count into v_count;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (null, 'DOWNLOAD_ALLOWED', 'delivery', v_access.delivery_id, jsonb_build_object('download_number', v_count));
  return query select true, v_delivery.pdf_storage_path, v_count;
end;
$$;

create function public.revoke_book_delivery(p_delivery_id uuid, p_actor_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order_id uuid;
begin
  if not exists (select 1 from public.user_roles r where r.user_id = p_actor_id and r.role = 'admin') then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  update public.digital_deliveries set revoked_at = coalesce(revoked_at, now()) where id = p_delivery_id returning order_id into v_order_id;
  if v_order_id is null then return false; end if;
  update public.download_access set revoked_at = coalesce(revoked_at, now()) where delivery_id = p_delivery_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'BOOK_ACCESS_REVOKED', 'order', v_order_id, jsonb_build_object('delivery_id', p_delivery_id));
  return true;
end;
$$;

revoke all on function public.confirm_book_payment_and_create_access(uuid,uuid,text,text,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.record_whatsapp_prepared(uuid,uuid) from public, anon, authenticated;
revoke all on function public.mark_whatsapp_message_sent(uuid,uuid) from public, anon, authenticated;
revoke all on function public.consume_download_access(uuid) from public, anon, authenticated;
revoke all on function public.revoke_book_delivery(uuid,uuid) from public, anon, authenticated;
grant execute on function public.confirm_book_payment_and_create_access(uuid,uuid,text,text,text,text,text,timestamptz) to service_role;
grant execute on function public.record_whatsapp_prepared(uuid,uuid) to service_role;
grant execute on function public.mark_whatsapp_message_sent(uuid,uuid) to service_role;
grant execute on function public.consume_download_access(uuid) to service_role;
grant execute on function public.revoke_book_delivery(uuid,uuid) to service_role;

commit;
