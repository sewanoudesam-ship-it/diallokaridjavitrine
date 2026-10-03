import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminBasePath, isPathWithin, toPublicAdminPath } from "../src/lib/admin-route";

const SEGMENT = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0";

afterEach(() => vi.unstubAllEnvs());

describe("private admin route", () => {
  it("uses only a 48-character lowercase hex segment in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_ROUTE_SEGMENT", SEGMENT);
    expect(getAdminBasePath()).toBe(`/${SEGMENT}`);
  });

  it("fails closed in production if the secret is missing or malformed", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_ROUTE_SEGMENT", "admin");
    expect(getAdminBasePath()).toBeNull();
    vi.stubEnv("ADMIN_ROUTE_SEGMENT", "");
    expect(getAdminBasePath()).toBeNull();
  });

  it("maps only explicit internal admin paths and preserves safe fixed query strings", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_ROUTE_SEGMENT", SEGMENT);
    expect(toPublicAdminPath("/admin")).toBe(`/${SEGMENT}`);
    expect(toPublicAdminPath("/admin/connexion")).toBe(`/${SEGMENT}/connexion`);
    expect(toPublicAdminPath("/admin/inscription?claim=1")).toBe(`/${SEGMENT}/inscription?claim=1`);
    expect(toPublicAdminPath("/administrator")).toBeNull();
    expect(toPublicAdminPath("https://attacker.example/" )).toBeNull();
  });

  it("matches exact base paths but not lookalike prefixes", () => {
    expect(isPathWithin("/secret", "/secret")).toBe(true);
    expect(isPathWithin("/secret/commandes", "/secret")).toBe(true);
    expect(isPathWithin("/secretary", "/secret")).toBe(false);
  });
});
