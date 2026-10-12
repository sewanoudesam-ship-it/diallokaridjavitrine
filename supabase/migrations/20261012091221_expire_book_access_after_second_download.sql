begin;

create or replace function public.consume_download_access(p_access_id uuid)
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
  set downloaded_count = downloaded_count + 1,
      last_download_at = now(),
      expires_at = case
        when downloaded_count + 1 >= max_downloads then now()
        else expires_at
      end
  where id = p_access_id
  returning downloaded_count into v_count;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (null, 'DOWNLOAD_ALLOWED', 'delivery', v_delivery.id, jsonb_build_object('download_number', v_count));
  return query select true, v_delivery.pdf_storage_path, v_count;
end;
$$;

commit;
