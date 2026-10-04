import { describe, expect, it } from "vitest";
import { isPublicAdminAuthPath, requiresAdminRole } from "../src/lib/admin-auth-policy";

describe("admin recovery route policy", () => {
  it("keeps login and recovery-request pages reachable without a session", () => {
    expect(isPublicAdminAuthPath("/admin/connexion")).toBe(true);
    expect(isPublicAdminAuthPath("/admin/mot-de-passe-oublie")).toBe(true);
    expect(requiresAdminRole("/admin/mot-de-passe-oublie")).toBe(false);
  });

  it("allows an unauthenticated recovery link to render, while requiring admin for signed-in users", () => {
    expect(isPublicAdminAuthPath("/admin/reinitialiser-mot-de-passe")).toBe(true);
    expect(requiresAdminRole("/admin/reinitialiser-mot-de-passe")).toBe(true);
  });

  it("continues to protect every private admin route", () => {
    expect(isPublicAdminAuthPath("/admin/commandes")).toBe(false);
    expect(requiresAdminRole("/admin/commandes")).toBe(true);
  });
});
