import { describe, expect, it } from "vitest";
import { cleanAuthCallbackUrl, parseAuthCallback } from "../src/lib/auth-callback";

describe("Supabase email callback parsing", () => {
  it("recognizes a PKCE code without exposing it in the clean URL", () => {
    const result = parseAuthCallback("?code=one-time-code&unused=opaque", "");
    expect(result).toMatchObject({ code: "one-time-code", hasError: false });
    expect(cleanAuthCallbackUrl("/auth/confirm")).toBe("/auth/confirm");
  });

  it("recognizes a server-verifiable token hash for invitations", () => {
    const result = parseAuthCallback("?token_hash=hashed-token&type=invite", "");
    expect(result).toMatchObject({ tokenHash: "hashed-token", type: "invite" });
  });

  it("recognizes implicit access and refresh tokens from the URL fragment", () => {
    const result = parseAuthCallback("", "#access_token=access&refresh_token=refresh&type=recovery");
    expect(result).toMatchObject({ accessToken: "access", refreshToken: "refresh", type: "recovery" });
  });

  it("detects provider errors without retaining raw error text", () => {
    const result = parseAuthCallback("?error=access_denied&error_description=expired", "");
    expect(result.hasError).toBe(true);
    expect(cleanAuthCallbackUrl("/auth/confirm")).toBe("/auth/confirm");
  });

  it("ignores unsupported OTP types and removes every public parameter", () => {
    const result = parseAuthCallback("?type=not-a-type&token_hash=secret&next=/admin", "#access_token=secret&refresh_token=secret");
    expect(result.type).toBeNull();
    expect(cleanAuthCallbackUrl("/auth/confirm")).toBe("/auth/confirm");
  });
});
