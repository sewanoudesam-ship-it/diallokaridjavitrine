import { describe, expect, it } from "vitest";
import { ECOWAS_COUNTRIES, isEcowasCountry } from "@/src/lib/countries";
import { normalizeEcowasPhone } from "@/src/lib/phone";

describe("CEDEAO phone policy", () => {
  it("contains only the 12 member states listed by the ECOWAS Commission", () => {
    expect(ECOWAS_COUNTRIES.map((country) => country.iso)).toEqual([
      "BJ", "CV", "CI", "GM", "GH", "GN", "GW", "LR", "NG", "SN", "SL", "TG",
    ]);
  });

  it("requires an explicitly supported country", () => {
    expect(isEcowasCountry("")).toBe(false);
    expect(isEcowasCountry("ML")).toBe(false);
    expect(normalizeEcowasPhone("", "").ok).toBe(false);
  });

  it("rejects malformed and non-national numbers", () => {
    expect(normalizeEcowasPhone("not-a-number", "CI").ok).toBe(false);
    expect(normalizeEcowasPhone("123", "NG").ok).toBe(false);
    expect(normalizeEcowasPhone("+1 202 555 0100", "CI").ok).toBe(false);
  });

  it("exposes each official dialing prefix from the phone metadata library", () => {
    expect(ECOWAS_COUNTRIES.every((country) => /^\+\d{1,3}$/.test(country.dialCode))).toBe(true);
  });
});
