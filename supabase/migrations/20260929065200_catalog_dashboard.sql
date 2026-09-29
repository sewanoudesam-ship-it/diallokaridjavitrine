begin;

create type public.product_availability as enum ('AVAILABLE', 'UNAVAILABLE');

-- Les brouillons de livre peuvent rester incomplets jusqu'à l'étape de tarification.
-- Aucun montant/devise fictif n'est créé pour permettre de démarrer un brouillon.
alter table public.books alter column price_amount drop not null;
alter table public.books alter column currency drop not null;
alter table public.books
  add constraint books_published_book_requires_price_currency
  check (status <> 'PUBLISHED' or (price_amount is not null and currency is not null));

alter table public.products
  add column reference text not null check (char_length(btrim(reference)) between 1 and 120),
  add column availability public.product_availability not null default 'UNAVAILABLE';
create unique index products_reference_unique on public.products(reference);

create or replace view public.published_products with (security_barrier = true) as
select p.id, p.name, p.slug, p.description, p.price_amount, p.currency, p.category,
       p.status, i.storage_path as image_path, p.reference, p.availability
from public.products p
left join lateral (
  select pi.storage_path from public.product_images pi
  where pi.product_id = p.id and pi.is_primary = true
  order by pi.created_at desc limit 1
) i on true
where p.status = 'PUBLISHED';
grant select on public.published_products to anon, authenticated;

create or replace function public.create_jewelry_order(
  p_customer_name text,
  p_phone_e164 text,
  p_country_iso text,
  p_email text,
  p_items jsonb
)
returns table (id uuid, order_number text, payment_status public.payment_status, total_amount numeric, currency text, admin_whatsapp_e164 text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_input_count integer;
  v_found_count integer;
  v_duplicate_count integer;
  v_total numeric(12,2);
  v_min_currency text;
  v_max_currency text;
  v_admin_whatsapp text;
  v_order_id uuid;
  v_order_number text;
begin
  perform public.validate_customer_order_input(p_customer_name, p_phone_e164, p_country_iso, p_email);
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_ITEMS' using errcode = '22023'; end if;
  v_input_count := jsonb_array_length(p_items);
  if v_input_count < 1 or v_input_count > 20 then raise exception 'INVALID_ITEMS' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    where x.product_id is null or x.quantity is null or x.quantity not between 1 and 99
  ) then raise exception 'INVALID_ITEM_QUANTITY' using errcode = '22023'; end if;
  select count(distinct x.product_id) into v_duplicate_count
  from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer);
  if v_duplicate_count <> v_input_count then raise exception 'DUPLICATE_ITEMS' using errcode = '22023'; end if;

  select count(*)::integer, sum(p.price_amount * x.quantity), min(p.currency), max(p.currency)
  into v_found_count, v_total, v_min_currency, v_max_currency
  from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  join public.products p on p.id = x.product_id and p.status = 'PUBLISHED' and p.availability = 'AVAILABLE';
  if v_found_count <> v_input_count then raise exception 'PRODUCT_NOT_AVAILABLE' using errcode = 'P0002'; end if;
  if v_min_currency is distinct from v_max_currency then raise exception 'MIXED_CURRENCIES' using errcode = '22023'; end if;
  select s.admin_whatsapp_e164 into v_admin_whatsapp from public.site_settings s where s.singleton = true;
  if v_admin_whatsapp is null then raise exception 'ADMIN_WHATSAPP_NOT_CONFIGURED' using errcode = '23514'; end if;

  insert into public.orders(order_type, customer_name, phone_e164, country_iso, email, total_amount, currency)
  values ('JEWELRY', btrim(p_customer_name), p_phone_e164, p_country_iso, nullif(btrim(p_email), ''), v_total, v_min_currency)
  returning orders.id, orders.order_number into v_order_id, v_order_number;

  insert into public.order_items(order_id, item_type, product_id, item_name_snapshot, quantity, unit_price_snapshot, currency_snapshot)
  select v_order_id, 'JEWELRY', p.id, p.name, x.quantity, p.price_amount, p.currency
  from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  join public.products p on p.id = x.product_id and p.status = 'PUBLISHED' and p.availability = 'AVAILABLE';

  return query select v_order_id, v_order_number, 'PENDING'::public.payment_status, v_total, v_min_currency, v_admin_whatsapp;
end;
$$;
revoke all on function public.create_jewelry_order(text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_jewelry_order(text,text,text,text,jsonb) to service_role;

create function public.admin_dashboard_metrics()
returns table (
  total_orders bigint,
  pending_payments bigint,
  books_sold bigint,
  downloads bigint,
  articles bigint,
  whatsapp_orders bigint
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from public.orders),
    (select count(*) from public.orders where payment_status = 'PENDING'),
    coalesce((
      select sum(i.quantity)::bigint
      from public.order_items i
      join public.orders o on o.id = i.order_id
      where i.item_type = 'BOOK' and o.payment_status = 'PAID'
    ), 0::bigint),
    coalesce((select sum(a.downloaded_count)::bigint from public.download_access a), 0::bigint),
    (select count(*) from public.products where status <> 'ARCHIVED'),
    (select count(*) from public.orders where order_type = 'JEWELRY' and status <> 'CANCELLED');
end;
$$;
revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated, service_role;

commit;
