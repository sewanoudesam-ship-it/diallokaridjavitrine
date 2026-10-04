const EMAIL_OTP_TYPES = ["signup", "recovery", "invite", "magiclink", "email_change", "email"] as const;

export type AuthCallbackOtpType = (typeof EMAIL_OTP_TYPES)[number];

export type ParsedAuthCallback = {
  code: string | null;
  tokenHash: string | null;
  type: AuthCallbackOtpType | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasError: boolean;
};

function cleanParams(value: string, prefix: "?" | "#"): URLSearchParams {
  return new URLSearchParams(value.startsWith(prefix) ? value.slice(1) : value);
}

function firstValue(query: URLSearchParams, fragment: URLSearchParams, key: string): string | null {
  return query.get(key) || fragment.get(key) || null;
}

export function parseAuthCallback(search: string, hash: string): ParsedAuthCallback {
  const query = cleanParams(search, "?");
  const fragment = cleanParams(hash, "#");
  const rawType = firstValue(query, fragment, "type");
  const type = EMAIL_OTP_TYPES.find((candidate) => candidate === rawType) ?? null;

  return {
    code: query.get("code"),
    tokenHash: firstValue(query, fragment, "token_hash"),
    type,
    accessToken: firstValue(query, fragment, "access_token"),
    refreshToken: firstValue(query, fragment, "refresh_token"),
    hasError: [query, fragment].some((params) => params.has("error") || params.has("error_code") || params.has("error_description")),
  };
}

export function hasAuthCallbackCredentials(callback: ParsedAuthCallback): boolean {
  return Boolean(callback.code || (callback.tokenHash && callback.type) || (callback.accessToken && callback.refreshToken));
}

export function isAuthCallbackPath(pathname: string): boolean {
  return pathname === "/auth/confirm" || pathname.startsWith("/auth/confirm/");
}

/** Remove all auth credentials and provider parameters from the browser address bar. */
export function cleanAuthCallbackUrl(pathname: string): string {
  return pathname;
}
