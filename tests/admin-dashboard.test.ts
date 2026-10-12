import { describe, expect, it } from "vitest";
import { buildDailyOrderTrend } from "../src/lib/admin-dashboard";

describe("admin dashboard daily order trend", () => {
  it("returns a complete zero-filled range and counts payments and service types", () => {
    const result = buildDailyOrderTrend([
      { created_at: "2026-10-05T11:30:00.000Z", payment_status: "PAID", order_type: "BOOK" },
      { created_at: "2026-10-04T20:00:00.000Z", payment_status: "PENDING", order_type: "JEWELRY" },
      { created_at: "2026-10-05T13:00:00.000Z", payment_status: "PAID", order_type: "JEWELRY" },
    ], 3, new Date("2026-10-05T12:00:00.000Z"));

    expect(result).toEqual([
      { day: "2026-10-03", orders: 0, paid: 0, books: 0, jewelry: 0 },
      { day: "2026-10-04", orders: 1, paid: 0, books: 0, jewelry: 1 },
      { day: "2026-10-05", orders: 2, paid: 2, books: 1, jewelry: 1 },
    ]);
  });

  it("ignores records outside the selected period", () => {
    const result = buildDailyOrderTrend([
      { created_at: "2026-10-01T10:00:00.000Z", payment_status: "PAID", order_type: "BOOK" },
      { created_at: "2026-10-02T10:00:00.000Z", payment_status: "PAID", order_type: "JEWELRY" },
    ], 1, new Date("2026-10-02T12:00:00.000Z"));

    expect(result).toEqual([{ day: "2026-10-02", orders: 1, paid: 1, books: 0, jewelry: 1 }]);
  });
});
