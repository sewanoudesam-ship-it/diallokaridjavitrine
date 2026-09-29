# External research notes (verified 2026-09-28)

## ECOWAS/CEDEAO country selector

- The Commission's recruitment page lists the 12 current member states: Benin, Cabo Verde, Côte d’Ivoire, The Gambia, Ghana, Guinea, Guinea Bissau, Liberia, Nigeria, Senegal, Sierra Leone and Togo.
- Official source: https://www.ecowas.int/careers/ (page retrieved 2026-09-28; page itself published 22 September 2026).
- ECOWAS's French ministerial communiqué states that Burkina Faso, Mali and Niger withdrew effective 29 January 2025.
- Official source: https://www.ecowas.int/session-extraordinaire-du-conseil-des-ministres-de-la-cedeao-sur-le-plan-de-contingence-et-les-modalites-de-retrait-du-burkina-faso-du-mali-et-du-niger-de-la-cedeao/?lang=fr
- Implementation consequence: do not include those three former members in the CEDEAO-only selector. Country calling codes are derived from `libphonenumber-js` metadata; flags are emoji.

## Next.js version/security selection

- Next's official 2025 advisory for CVE-2025-66478 identifies 15.5.7 and 16.0.7 among fixed releases: https://nextjs.org/blog/CVE-2025-66478
- Next's official update dated 22 September 2026 says 16.3.6 is Active LTS and 15.5.26 is Maintenance LTS, and advises patching; 16.2.0 through 16.3.5 are affected by a Node.js `ImageResponse` RCE: https://nextjs.org/blog/nextjs-security-update-september-22-2026
- Selected `next@16.3.6` for a new project, with compatible React 19.3.0. This avoids the initially downloaded but deprecated/vulnerable 15.5.3 build.

## Connected infrastructure facts

- Supabase `get_cost` for a new project returned `{type: project, recurrence: monthly, amount: 0}`; Karidja explicitly confirmed this estimate and the `maison-karidja` project in `BAC TCHÉ`, region `eu-west-3`.
- Supabase `create_project` then rejected provisioning: organization-member limit reached for active free projects (2-project limit). No existing Supabase project was changed. User has a deferred question pending about resolving capacity.
- Initial Vercel `list_teams` returned zero accessible teams. Recheck user/personal scope before project creation; do not select another account arbitrarily.
- GitHub repository `sewanoudesam-ship-it/maison-karidja` was verified private with size 0, then deleted as explicitly approved. The managed Git confirmation request for recreating the private repository was prepared. It must not be repeated; transfer GET returned `transfer: null` until owner confirmation.

## State refresh (verified 2026-09-29)

- The earlier project-capacity/Vercel observations above describe the previous provisioning attempt. The user later confirmed a newly provisioned Supabase project: `wdvqdcluzlimyfuzpwgc` (`https://wdvqdcluzlimyfuzpwgc.supabase.co`).
- Four migrations are recorded and applied: initial schema, order RPCs, catalog/dashboard metrics, and `20260929074500_security_hardening.sql` (security-invoker public views plus FK indexes).
- Seven Edge Functions are active with JWT verification enabled. Three custom secrets are stored in Supabase Edge settings; no secret values are in project files.
- Final advisor check: no remaining view-security-definer finding. Two intentional authenticated-only SECURITY DEFINER warnings remain: `is_admin()` is the RLS role predicate; `admin_dashboard_metrics()` calls that predicate and raises `ADMIN_REQUIRED` unless the current Auth user is admin. Both revoke `public`/`anon` execution. Performance advisor marks 18 indexes unused at INFO while every business table remains empty; retain them pending real workload.
- `books`, `products`, `orders`, `digital_deliveries`, `user_roles`, and `site_settings` were verified to contain zero rows. This is intentional: no administrator or commercial/customer data has been fabricated.
- The user explicitly excluded Vercel. The project is available through temporary Sandbox/WebDev preview only; the existing GitHub public repository is a separate source mirror, not a production host.

- Dependency security follow-up: after the GitHub push hook reported 13 alerts, updated Vitest from 3.2.4 to 4.1.11 and forced PostCSS 8.5.28 across the pnpm workspace (including the Vite copy). Typecheck, lint, all 6 tests, production build, and `pnpm audit` passed; audit reports 0 known vulnerabilities. The GitHub Dependabot Alerts API returned 403 `Resource not accessible by integration`, so the remote alert list itself could not be confirmed; see the repository Security → Dependabot page.
