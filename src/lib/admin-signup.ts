const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ADMIN_SIGNUP_MIN_PASSWORD_LENGTH = 12;

export type AdminSignupError = "EMAIL_INVALID" | "PASSWORD_TOO_SHORT" | "PASSWORD_MISMATCH";

export function normalizeAdminSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildAdminSignupRedirect(siteUrl: string | null | undefined, currentOrigin: string): string {
  const redirectBase = siteUrl?.trim() || currentOrigin;
  const redirect = new URL("/auth/confirm", redirectBase);
  redirect.searchParams.set("flow", "signup");
  return redirect.toString();
}

export function validateAdminSignupInput(
  email: string,
  password: string,
  confirmation: string,
): AdminSignupError | null {
  const normalizedEmail = normalizeAdminSignupEmail(email);
  if (!normalizedEmail || normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    return "EMAIL_INVALID";
  }
  if (password.length < ADMIN_SIGNUP_MIN_PASSWORD_LENGTH) return "PASSWORD_TOO_SHORT";
  if (password !== confirmation) return "PASSWORD_MISMATCH";
  return null;
}
