export const ADMIN_PUBLIC_BASE_PATH = "/caridja_diallo_admin_principe";
export const ADMIN_PUBLIC_LEGACY_BASE_PATH = "/Karidja_diallo_admin_principe";
const INTERNAL_ADMIN_BASE_PATH = "/admin";

/** The public admin URL is a locator only; authentication and the admin role remain mandatory. */
export function getAdminBasePath(): string {
  return ADMIN_PUBLIC_BASE_PATH;
}

/** Convert an explicit internal `/admin` path to the canonical public path. */
export function toPublicAdminPath(internalPath: string): string | null {
  if (!/^\/admin(?:\/|\?|#|$)/.test(internalPath)) return null;
  return `${ADMIN_PUBLIC_BASE_PATH}${internalPath.slice(INTERNAL_ADMIN_BASE_PATH.length)}`;
}

export function isPathWithin(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}
