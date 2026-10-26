import { describe, expect, it } from "vitest";
import { buildDailyOrderTrend, buildDailyRevenueTrend } from "../src/lib/admin-dashboard";

describe("admin dashboard daily order trend", () => {
  it("returns a complete zero-filled range and counts all payment statuses and service types", () => {
    const result = buildDailyOrderTrend([
      { created_at: "2026-10-05T11:30:00.000Z", payment_status: "PAID", order_type: "BOOK" },
      { created_at: "2026-10-04T20:00:00.000Z", payment_status: "PENDING", order_type: "JEWELRY" },
      { created_at: "2026-10-05T13:00:00.000Z", payment_status: "PAID", order_type: "JEWELRY" },
      { created_at: "2026-10-04T16:00:00.000Z", payment_status: "REJECTED", order_type: "BOOK" },
      { created_at: "2026-10-05T18:00:00.000Z", payment_status: "REFUNDED", order_type: "JEWELRY" },
    ], 3, new Date("2026-10-05T12:00:00.000Z"));

    expect(result).toEqual([
      { day: "2026-10-03", orders: 0, paid: 0, pending: 0, rejected: 0, refunded: 0, books: 0, jewelry: 0 },
      { day: "2026-10-04", orders: 2, paid: 0, pending: 1, rejected: 1, refunded: 0, books: 1, jewelry: 1 },
      { day: "2026-10-05", orders: 3, paid: 2, pending: 0, rejected: 0, refunded: 1, books: 1, jewelry: 2 },
    ]);
  });

  it("ignores records outside the selected period", () => {
    const result = buildDailyOrderTrend([
      { created_at: "2026-10-01T10:00:00.000Z", payment_status: "PAID", order_type: "BOOK" },
      { created_at: "2026-10-02T10:00:00.000Z", payment_status: "PAID", order_type: "JEWELRY" },
    ], 1, new Date("2026-10-02T12:00:00.000Z"));

    expect(result).toEqual([{
      day: "2026-10-02", orders: 1, paid: 1, pending: 0, rejected: 0, refunded: 0, books: 0, jewelry: 1,
    }]);
  });
});

describe("admin dashboard revenue trend", () => {
  it("aggregates paid amounts by payment date without mixing currencies", () => {
    const result = buildDailyRevenueTrend([
      { created_at: "2026-10-05T11:30:00.000Z", paid_at: "2026-10-05T12:00:00.000Z", payment_status: "PAID", order_type: "BOOK", total_amount: 5000, currency: "XOF" },
      { created_at: "2026-10-05T13:00:00.000Z", paid_at: "2026-10-04T23:30:00.000Z", payment_status: "PAID", order_type: "JEWELRY", total_amount: 2000, currency: "XOF" },
      { created_at: "2026-10-05T14:00:00.000Z", paid_at: "2026-10-05T14:00:00.000Z", payment_status: "PAID", order_type: "JEWELRY", total_amount: 12.5, currency: "EUR" },
      { created_at: "2026-10-05T15:00:00.000Z", payment_status: "PENDING", order_type: "BOOK", total_amount: 9000, currency: "XOF" },
      { created_at: "2026-10-05T16:00:00.000Z", payment_status: "PAID", order_type: "BOOK", total_amount: 7000, currency: "US" },
    ], 3, new Date("2026-10-05T12:00:00.000Z"));

    expect(result).toEqual([
      { currency: "EUR", points: [
        { day: "2026-10-03", amount: 0 }, { day: "2026-10-04", amount: 0 }, { day: "2026-10-05", amount: 12.5 },
      ] },
      { currency: "XOF", points: [
        { day: "2026-10-03", amount: 0 }, { day: "2026-10-04", amount: 2000 }, { day: "2026-10-05", amount: 5000 },
      ] },
    ]);
  });

  it("uses created_at when paid_at is absent and ignores amounts outside the selected period", () => {
    const result = buildDailyRevenueTrend([
      { created_at: "2026-10-02T10:00:00.000Z", payment_status: "PAID", order_type: "BOOK", total_amount: 2500, currency: "XOF" },
      { created_at: "2026-10-01T10:00:00.000Z", paid_at: "2026-10-01T10:00:00.000Z", payment_status: "PAID", order_type: "BOOK", total_amount: 4000, currency: "XOF" },
    ], 1, new Date("2026-10-02T12:00:00.000Z"));

    expect(result).toEqual([{ currency: "XOF", points: [{ day: "2026-10-02", amount: 2500 }] }]);
  });
});
