import { describe, expect, it } from "vitest";
import { buildDailyOrderTrend } from "../src/lib/admin-dashboard";

describe("admin dashboard daily order trend", () => {
  it("returns a complete zero-filled range and counts paid orders", () => {
    const result = buildDailyOrderTrend([
      { created_at: "2026-10-05T11:30:00.000Z", payment_status: "PAID" },
      { created_at: "2026-10-04T20:00:00.000Z", payment_status: "PENDING" },
    ], 3, new Date("2026-10-05T12:00:00.000Z"));

    expect(result).toEqual([
      { day: "2026-10-03", orders: 0, paid: 0 },
      { day: "2026-10-04", orders: 1, paid: 0 },
      { day: "2026-10-05", orders: 1, paid: 1 },
    ]);
  });

  it("ignores records outside the selected period", () => {
    const result = buildDailyOrderTrend([
      { created_at: "2026-10-01T10:00:00.000Z", payment_status: "PAID" },
      { created_at: "2026-10-02T10:00:00.000Z", payment_status: "PAID" },
    ], 1, new Date("2026-10-02T12:00:00.000Z"));

    expect(result).toEqual([{ day: "2026-10-02", orders: 1, paid: 1 }]);
  });
});
