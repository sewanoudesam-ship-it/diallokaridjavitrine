begin;

create function public.validate_customer_order_input(p_customer_name text, p_phone_e164 text, p_country_iso text, p_email text)
returns boolean language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 1 and 120 then
    raise exception 'INVALID_CUSTOMER_NAME' using errcode = '22023';
  end if;
  if p_phone_e164 is null or p_phone_e164 !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;
  if p_country_iso is null or p_country_iso not in ('BJ','CV','CI','GM','GH','GN','GW','LR','NG','SN','SL','TG') then
    raise exception 'UNSUPPORTED_COUNTRY' using errcode = '22023';
  end if;
  if p_email is not null and (char_length(p_email) > 254 or position('@' in p_email) < 2) then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  return true;
end;
$$;

create function public.create_book_order(
  p_book_id uuid,
  p_customer_name text,
  p_phone_e164 text,
  p_country_iso text,
  p_email text default null
)
returns table (id uuid, order_number text, payment_status public.payment_status)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_book public.books%rowtype;
  v_order_id uuid;
  v_order_number text;
begin
  perform public.validate_customer_order_input(p_customer_name, p_phone_e164, p_country_iso, p_email);
  select * into v_book from public.books
  where books.id = p_book_id and books.status = 'PUBLISHED' and books.original_pdf_path is not null;
  if not found then raise exception 'BOOK_NOT_AVAILABLE' using errcode = 'P0002'; end if;

  insert into public.orders(order_type, book_id, customer_name, phone_e164, country_iso, email, total_amount, currency)
  values ('BOOK', v_book.id, btrim(p_customer_name), p_phone_e164, p_country_iso, nullif(btrim(p_email), ''), v_book.price_amount, v_book.currency)
  returning orders.id, orders.order_number into v_order_id, v_order_number;

  insert into public.order_items(order_id, item_type, book_id, item_name_snapshot, quantity, unit_price_snapshot, currency_snapshot)
  values (v_order_id, 'BOOK', v_book.id, v_book.title, 1, v_book.price_amount, v_book.currency);

  return query select v_order_id, v_order_number, 'PENDING'::public.payment_status;
end;
$$;

create function public.create_jewelry_order(
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
  join public.products p on p.id = x.product_id and p.status = 'PUBLISHED';
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
  join public.products p on p.id = x.product_id and p.status = 'PUBLISHED';

  return query select v_order_id, v_order_number, 'PENDING'::public.payment_status, v_total, v_min_currency, v_admin_whatsapp;
end;
$$;

revoke all on function public.validate_customer_order_input(text,text,text,text) from public, anon, authenticated;
revoke all on function public.create_book_order(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.create_jewelry_order(text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_book_order(uuid,text,text,text,text) to service_role;
grant execute on function public.create_jewelry_order(text,text,text,text,jsonb) to service_role;

commit;
