import { afterEach, describe, expect, it, vi } from "vitest";
import { ADMIN_PUBLIC_BASE_PATH, ADMIN_PUBLIC_LEGACY_BASE_PATH, getAdminBasePath, isPathWithin, toPublicAdminPath } from "../src/lib/admin-route";

afterEach(() => vi.unstubAllEnvs());

describe("canonical admin route", () => {
  it("uses the exact public path requested even when the old opaque environment variable is set", () => {
    vi.stubEnv("ADMIN_ROUTE_SEGMENT", "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0");
    expect(getAdminBasePath()).toBe("/Karidja_diallo_admin_principe");
    expect(ADMIN_PUBLIC_BASE_PATH).toBe("/Karidja_diallo_admin_principe");
  });

  it("keeps the mistaken lowercase variant available only as a legacy alias", () => {
    expect(ADMIN_PUBLIC_LEGACY_BASE_PATH).toBe("/caridja_diallo_admin_principe");
  });

  it("maps only explicit internal admin paths", () => {
    expect(toPublicAdminPath("/admin")).toBe("/Karidja_diallo_admin_principe");
    expect(toPublicAdminPath("/admin/connexion")).toBe("/Karidja_diallo_admin_principe/connexion");
    expect(toPublicAdminPath("/admin/sign_up?claim=1")).toBe("/Karidja_diallo_admin_principe/sign_up?claim=1");
    expect(toPublicAdminPath("/administrator")).toBeNull();
    expect(toPublicAdminPath("https://attacker.example/")).toBeNull();
  });

  it("matches exact base paths but not lookalike prefixes", () => {
    expect(isPathWithin("/Karidja_diallo_admin_principe", ADMIN_PUBLIC_BASE_PATH)).toBe(true);
    expect(isPathWithin("/Karidja_diallo_admin_principe/commandes", ADMIN_PUBLIC_BASE_PATH)).toBe(true);
    expect(isPathWithin("/Karidja_diallo_admin_principes", ADMIN_PUBLIC_BASE_PATH)).toBe(false);
  });
});
