import { describe, expect, it } from "vitest";
import { generateAccessCode, isValidAccessCode } from "../supabase/functions/_shared/access-code";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function codeOfLength(length: number): string {
  return alphabet.slice(0, length);
}

describe("digital access codes", () => {
  it("generates 16-character codes using the unambiguous alphabet", () => {
    const code = generateAccessCode();
    expect(code).toHaveLength(16);
    expect(isValidAccessCode(code)).toBe(true);
  });

  it("continues accepting previously issued 10-character codes", () => {
    expect(isValidAccessCode(codeOfLength(10))).toBe(true);
  });

  it("rejects unsupported lengths and characters", () => {
    expect(isValidAccessCode(codeOfLength(9))).toBe(false);
    expect(isValidAccessCode(codeOfLength(11))).toBe(false);
    expect(isValidAccessCode(`${codeOfLength(15)}0`)).toBe(false);
    expect(isValidAccessCode(codeOfLength(16).toLowerCase())).toBe(false);
  });
});
