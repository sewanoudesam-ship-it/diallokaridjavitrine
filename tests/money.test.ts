import { describe, expect, it } from "vitest";
import { formatPrice } from "@/src/lib/money";

describe("formatPrice", () => {
  it("formats a supplied amount using the supplied currency", () => {
    expect(formatPrice(0, "XOF")).toContain("XOF");
  });

  it("returns no misleading price for non-finite or negative amounts", () => {
    expect(formatPrice(Number.NaN, "XOF")).toBe("");
    expect(formatPrice(-1, "XOF")).toBe("");
  });
});
