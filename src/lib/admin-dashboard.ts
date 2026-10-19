export type DashboardOrder = {
  created_at: string;
  payment_status: string;
  order_type: string;
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

export function buildDailyOrderTrend(
  rows: DashboardOrder[],
  days: number,
  now = new Date(),
): DailyOrderPoint[] {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const firstDay = new Date(today);
  firstDay.setUTCDate(firstDay.getUTCDate() - days + 1);
  const points = new Map<string, DailyOrderPoint>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(firstDay);
    date.setUTCDate(firstDay.getUTCDate() + offset);
    const day = date.toISOString().slice(0, 10);
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
