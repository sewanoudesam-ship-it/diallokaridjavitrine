const PUBLIC_ADMIN_AUTH_PATHS = new Set([
  "/admin/connexion",
  "/admin/inscription",
  "/admin/mot-de-passe-oublie",
  "/admin/reinitialiser-mot-de-passe",
]);

const ADMIN_ROLE_REQUIRED_PUBLIC_PATHS = new Set([
  "/admin/reinitialiser-mot-de-passe",
]);

export function isPublicAdminAuthPath(internalPath: string): boolean {
  return PUBLIC_ADMIN_AUTH_PATHS.has(internalPath);
}

/**
 * Recovery pages must load without a session so an expired link can be explained,
 * but an already signed-in visitor may only change a password if they are admin.
 */
export function requiresAdminRole(internalPath: string): boolean {
  return !isPublicAdminAuthPath(internalPath) || ADMIN_ROLE_REQUIRED_PUBLIC_PATHS.has(internalPath);
}
