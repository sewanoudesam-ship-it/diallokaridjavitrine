begin;

-- Public views must apply the caller's privileges and underlying RLS policies.
alter view public.published_products set (security_invoker = true, security_barrier = true);
alter view public.published_books set (security_invoker = true, security_barrier = true);
alter view public.public_site_settings set (security_invoker = true, security_barrier = true);

-- Cover foreign keys used by administration, audit, and cleanup queries.
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists books_created_by_idx on public.books(created_by);
create index if not exists digital_deliveries_created_by_idx on public.digital_deliveries(created_by);
create index if not exists order_items_book_id_idx on public.order_items(book_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists orders_book_id_idx on public.orders(book_id);
create index if not exists orders_paid_by_idx on public.orders(paid_by);
create index if not exists product_images_uploaded_by_idx on public.product_images(uploaded_by);
create index if not exists products_created_by_idx on public.products(created_by);
create index if not exists site_settings_updated_by_idx on public.site_settings(updated_by);
create index if not exists user_roles_granted_by_idx on public.user_roles(granted_by);
create index if not exists whatsapp_messages_prepared_by_idx on public.whatsapp_messages(prepared_by);
create index if not exists whatsapp_messages_sent_by_idx on public.whatsapp_messages(sent_by);

commit;
