export type DashboardOrder = {
  created_at: string;
  payment_status: string;
  order_type: string;
  paid_at?: string | null;
  total_amount?: number;
  currency?: string;
};

export type DailyOrderPoint = {
  day: string;
  orders: number;
  paid: number;
  pending: number;
  rejected: number;
  refunded: number;
  books: number;
  jewelry: number;
};

export type DailyRevenueSeries = {
  currency: string;
  points: { day: string; amount: number }[];
};

function getDayRange(days: number, now: Date): string[] {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const firstDay = new Date(today);
  firstDay.setUTCDate(firstDay.getUTCDate() - days + 1);
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(firstDay);
    date.setUTCDate(firstDay.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

export function buildDailyOrderTrend(
  rows: DashboardOrder[],
  days: number,
  now = new Date(),
): DailyOrderPoint[] {
  const dayRange = getDayRange(days, now);
  const points = new Map<string, DailyOrderPoint>();

  for (const day of dayRange) {
    points.set(day, { day, orders: 0, paid: 0, pending: 0, rejected: 0, refunded: 0, books: 0, jewelry: 0 });
  }

  for (const row of rows) {
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    const point = points.get(day);
    if (!point) continue;
    point.orders += 1;
    if (row.payment_status === "PAID") point.paid += 1;
    if (row.payment_status === "PENDING") point.pending += 1;
    if (row.payment_status === "REJECTED") point.rejected += 1;
    if (row.payment_status === "REFUNDED") point.refunded += 1;
    if (row.order_type === "BOOK") point.books += 1;
    if (row.order_type === "JEWELRY") point.jewelry += 1;
  }

  return [...points.values()];
}

export function buildDailyRevenueTrend(
  rows: DashboardOrder[],
  days: number,
  now = new Date(),
): DailyRevenueSeries[] {
  const dayRange = getDayRange(days, now);
  const firstDay = dayRange[0];
  const lastDay = dayRange[dayRange.length - 1];
  const amountsByCurrency = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (row.payment_status !== "PAID" || !row.currency || !/^[A-Z]{3}$/.test(row.currency)) continue;
    if (typeof row.total_amount !== "number" || !Number.isFinite(row.total_amount) || row.total_amount < 0) continue;
    const paidDate = new Date(row.paid_at ?? row.created_at);
    if (Number.isNaN(paidDate.getTime())) continue;
    const day = paidDate.toISOString().slice(0, 10);
    if (day < firstDay || day > lastDay) continue;

    let amountsByDay = amountsByCurrency.get(row.currency);
    if (!amountsByDay) {
      amountsByDay = new Map(dayRange.map((rangeDay) => [rangeDay, 0]));
      amountsByCurrency.set(row.currency, amountsByDay);
    }
    amountsByDay.set(day, (amountsByDay.get(day) ?? 0) + row.total_amount);
  }

  return [...amountsByCurrency.entries()]
    .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
    .map(([currency, amountsByDay]) => ({
      currency,
      points: dayRange.map((day) => ({ day, amount: amountsByDay.get(day) ?? 0 })),
    }));
}
