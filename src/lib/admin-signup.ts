const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}'’ -]{0,79}$/u;

export type AdminSignupError = "FIRST_NAME_INVALID" | "LAST_NAME_INVALID" | "EMAIL_INVALID";

export function normalizeAdminSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildAdminSignupRedirect(siteUrl: string | null | undefined, currentOrigin: string): string {
  const redirectBase = siteUrl?.trim() || currentOrigin;
  const redirect = new URL("/auth/confirm", redirectBase);
  redirect.searchParams.set("flow", "signup");
  return redirect.toString();
}

export function validateAdminSignupInput(firstName: string, lastName: string, email: string): AdminSignupError | null {
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedEmail = normalizeAdminSignupEmail(email);
  if (!normalizedFirstName || normalizedFirstName.length > 80 || !NAME_PATTERN.test(normalizedFirstName)) return "FIRST_NAME_INVALID";
  if (!normalizedLastName || normalizedLastName.length > 80 || !NAME_PATTERN.test(normalizedLastName)) return "LAST_NAME_INVALID";
  if (!normalizedEmail || normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) return "EMAIL_INVALID";
  return null;
}
