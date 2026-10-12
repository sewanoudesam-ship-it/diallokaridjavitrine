begin;

-- The source tables remain restricted to authenticated admins through RLS and
-- have no SELECT grant for anon. These views intentionally expose only public
-- columns and already filter to published records / the singleton public settings.
-- Run them with the view owner's privileges while retaining the security barrier.
alter view public.published_books
  set (security_invoker = false, security_barrier = true);
alter view public.published_products
  set (security_invoker = false, security_barrier = true);
alter view public.public_site_settings
  set (security_invoker = false, security_barrier = true);

commit;
