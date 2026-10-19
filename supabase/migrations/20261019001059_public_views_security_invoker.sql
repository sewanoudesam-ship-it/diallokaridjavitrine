begin;

-- Keep the public catalog readable while applying the caller's RLS policies.
-- Anonymous clients receive only the columns deliberately exposed by the public views.
revoke all on table public.books, public.products, public.product_images, public.site_settings from anon;
grant select (id, title, author, slug, description, price_amount, currency, excerpt, status, cover_path)
  on table public.books to anon;
grant select (id, name, slug, description, price_amount, currency, category, status, reference, availability)
  on table public.products to anon;
grant select (product_id, storage_path, is_primary, created_at)
  on table public.product_images to anon;
grant select (singleton, admin_whatsapp_e164, support_email, legal_entity_name, business_address)
  on table public.site_settings to anon;

-- Only the anonymous public role gets these row-level policies. Authenticated
-- access continues to use the existing admin-only policies on the base tables.
create policy books_public_published_select on public.books
  for select to anon
  using (status = 'PUBLISHED');

create policy products_public_published_select on public.products
  for select to anon
  using (status = 'PUBLISHED');

create policy product_images_public_published_primary_select on public.product_images
  for select to anon
  using (
    is_primary
    and exists (
      select 1
      from public.products p
      where p.id = public.product_images.product_id
        and p.status = 'PUBLISHED'
    )
  );

create policy site_settings_public_singleton_select on public.site_settings
  for select to anon
  using (singleton = true);

-- Preserve the security-barrier predicates while enforcing invoker privileges and RLS.
alter view public.published_products set (security_invoker = true);
alter view public.published_books set (security_invoker = true);
alter view public.public_site_settings set (security_invoker = true);

commit;
