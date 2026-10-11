import { describe, expect, it } from "vitest";
import {
  ADMIN_SIGNUP_MIN_PASSWORD_LENGTH,
  buildAdminSignupRedirect,
  normalizeAdminSignupEmail,
  validateAdminSignupInput,
} from "../src/lib/admin-signup";

describe("open admin signup input", () => {
  it("normalizes the email without changing password contents", () => {
    expect(normalizeAdminSignupEmail("  Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("builds a signup-specific callback on the configured site origin", () => {
    expect(buildAdminSignupRedirect("https://karidja.example", "http://localhost:3000"))
      .toBe("https://karidja.example/auth/confirm?flow=signup");
    expect(buildAdminSignupRedirect("", "http://localhost:3000"))
      .toBe("http://localhost:3000/auth/confirm?flow=signup");
  });

  it("rejects invalid or overlong emails", () => {
    expect(validateAdminSignupInput("not-an-email", "correct-horse-battery", "correct-horse-battery")).toBe("EMAIL_INVALID");
    expect(validateAdminSignupInput(`${"a".repeat(245)}@example.com`, "correct-horse-battery", "correct-horse-battery")).toBe("EMAIL_INVALID");
  });

  it("requires a 12-character password and matching confirmation", () => {
    expect(ADMIN_SIGNUP_MIN_PASSWORD_LENGTH).toBe(12);
    expect(validateAdminSignupInput("admin@example.com", "too-short", "too-short")).toBe("PASSWORD_TOO_SHORT");
    expect(validateAdminSignupInput("admin@example.com", "long-password-123", "different-password")).toBe("PASSWORD_MISMATCH");
    expect(validateAdminSignupInput("admin@example.com", "long-password-123", "long-password-123")).toBeNull();
  });
});
