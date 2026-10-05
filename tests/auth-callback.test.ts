import { describe, expect, it } from "vitest";
import {
  cleanAuthCallbackUrl,
  hasAuthCallbackCredentials,
  isAuthCallbackPath,
  parseAuthCallback,
  shouldRedirectAuthCallback,
} from "../src/lib/auth-callback";

describe("Supabase email callback parsing", () => {
  it("recognizes a PKCE code without exposing it in the clean URL", () => {
    const result = parseAuthCallback("?code=one-time-code&unused=opaque", "");
    expect(result).toMatchObject({ code: "one-time-code", hasError: false });
    expect(hasAuthCallbackCredentials(result)).toBe(true);
    expect(cleanAuthCallbackUrl("/auth/confirm")).toBe("/auth/confirm");
  });

  it("recognizes a server-verifiable token hash for invitations", () => {
    const result = parseAuthCallback("?token_hash=hashed-token&type=invite", "");
    expect(result).toMatchObject({ tokenHash: "hashed-token", type: "invite" });
    expect(hasAuthCallbackCredentials(result)).toBe(true);
  });

  it("recognizes implicit access and refresh tokens from the URL fragment", () => {
    const result = parseAuthCallback("", "#access_token=access&refresh_token=refresh&type=recovery");
    expect(result).toMatchObject({ accessToken: "access", refreshToken: "refresh", type: "recovery" });
    expect(hasAuthCallbackCredentials(result)).toBe(true);
  });

  it("detects provider errors without retaining raw error text", () => {
    const result = parseAuthCallback("?error=access_denied&error_description=expired", "");
    expect(result.hasError).toBe(true);
    expect(cleanAuthCallbackUrl("/auth/confirm")).toBe("/auth/confirm");
  });

  it("ignores unsupported OTP types but accepts a complete session token pair", () => {
    const result = parseAuthCallback("?type=not-a-type&token_hash=secret&next=/admin", "#access_token=secret&refresh_token=secret");
    expect(result.type).toBeNull();
    expect(hasAuthCallbackCredentials(result)).toBe(true);
    expect(cleanAuthCallbackUrl("/auth/confirm")).toBe("/auth/confirm");
  });

  it("classifies only the auth callback route and its children as sensitive", () => {
    expect(isAuthCallbackPath("/auth/confirm")).toBe(true);
    expect(isAuthCallbackPath("/auth/confirm/complete")).toBe(true);
    expect(isAuthCallbackPath("/admin/connexion")).toBe(false);
    expect(isAuthCallbackPath("/auth/confirmation")).toBe(false);
  });

  it("routes links landing on a public URL through the callback, including fragments", () => {
    expect(shouldRedirectAuthCallback("/", "?code=one-time-code", "")).toBe(true);
    expect(shouldRedirectAuthCallback("/", "", "#access_token=access&refresh_token=refresh&type=magiclink")).toBe(true);
    expect(shouldRedirectAuthCallback("/", "?error=access_denied", "")).toBe(true);
    expect(shouldRedirectAuthCallback("/", "?category=books", "")).toBe(false);
    expect(shouldRedirectAuthCallback("/auth/confirm", "?code=one-time-code", "")).toBe(false);
  });
});
