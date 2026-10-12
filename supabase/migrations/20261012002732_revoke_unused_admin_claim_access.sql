begin;

-- The open email-confirmation flow and the service-side invitation path no longer call this legacy RPC.
-- Disable direct authenticated invocation so future code cannot accidentally restore the obsolete path.
revoke execute on function public.claim_admin_access(text) from public, anon, authenticated;

commit;
