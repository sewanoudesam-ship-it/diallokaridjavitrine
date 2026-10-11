import { describe, expect, it } from "vitest";
import { buildAdminSignupRedirect, normalizeAdminSignupEmail, validateAdminSignupInput } from "../src/lib/admin-signup";

describe("admin signup by email confirmation", () => {
  it("normalizes the email", () => {
    expect(normalizeAdminSignupEmail("  Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("builds a signup-specific callback on the configured site origin", () => {
    expect(buildAdminSignupRedirect("https://karidja.example", "http://localhost:3000"))
      .toBe("https://karidja.example/auth/confirm?flow=signup");
    expect(buildAdminSignupRedirect("", "http://localhost:3000"))
      .toBe("http://localhost:3000/auth/confirm?flow=signup");
  });

  it("requires a valid first name, last name and email", () => {
    expect(validateAdminSignupInput("", "Diallo", "admin@example.com")).toBe("FIRST_NAME_INVALID");
    expect(validateAdminSignupInput("Karidja", "", "admin@example.com")).toBe("LAST_NAME_INVALID");
    expect(validateAdminSignupInput("Karidja", "Diallo", "not-an-email")).toBe("EMAIL_INVALID");
    expect(validateAdminSignupInput("Karidja", "DIALLO", "admin@example.com")).toBeNull();
  });
});
