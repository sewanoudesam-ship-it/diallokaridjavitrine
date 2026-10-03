import { describe, expect, it } from "vitest";
import { generateAdminCode, hashAdminCode, isValidAdminCode } from "../src/lib/admin-access-code";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const syntheticTestCode = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function codeOfLength(length: number): string {
  return alphabet.slice(0, length).padEnd(length, "A");
}

describe("admin bootstrap and invitation codes", () => {
  it("generates unique, valid 32-character bearer codes", () => {
    const first = generateAdminCode();
    const second = generateAdminCode();
    expect(first).toHaveLength(32);
    expect(isValidAdminCode(first)).toBe(true);
    expect(isValidAdminCode(second)).toBe(true);
    expect(first).not.toBe(second);
  });

  it("normalizes code case before hashing with the SQL digest format", async () => {
    const hash = await hashAdminCode(syntheticTestCode.toLowerCase());
    expect(hash).toBe("b727c3b5ea209d8d2aa991d383e8291d1090864b504c6598f6fa57b7576ad5e9");
  });

  it("rejects invalid length and ambiguous characters", async () => {
    expect(isValidAdminCode(codeOfLength(31))).toBe(false);
    expect(isValidAdminCode(`${codeOfLength(31)}I`)).toBe(false);
    await expect(hashAdminCode("bad-code")).rejects.toThrow("ADMIN_CODE_INVALID");
  });
});
