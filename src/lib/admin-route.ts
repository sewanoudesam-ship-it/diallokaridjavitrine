const ADMIN_ROUTE_SEGMENT_PATTERN = /^[a-f0-9]{48}$/;
const INTERNAL_ADMIN_BASE_PATH = "/admin";

/**
 * Production requires a randomly generated 192-bit path segment supplied only
 * as a server-side environment variable. The predictable path is a local-dev
 * convenience only and is never accepted as the production setting.
 */
export function getAdminBasePath(): string | null {
  const segment = process.env.ADMIN_ROUTE_SEGMENT?.trim();
  if (segment && ADMIN_ROUTE_SEGMENT_PATTERN.test(segment)) return `/${segment}`;
  if (process.env.NODE_ENV !== "production") return INTERNAL_ADMIN_BASE_PATH;
  return null;
}

/** Convert a small, explicit internal `/admin` path to its public opaque path. */
export function toPublicAdminPath(internalPath: string): string | null {
  if (!/^\/admin(?:\/|\?|#|$)/.test(internalPath)) return null;
  const basePath = getAdminBasePath();
  if (!basePath) return null;
  return `${basePath}${internalPath.slice(INTERNAL_ADMIN_BASE_PATH.length)}`;
}

export function isPathWithin(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}
