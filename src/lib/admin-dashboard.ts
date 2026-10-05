export type DashboardOrder = {
  created_at: string;
  payment_status: string;
};

export type DailyOrderPoint = {
  day: string;
  orders: number;
  paid: number;
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
    points.set(day, { day, orders: 0, paid: 0 });
  }

  for (const row of rows) {
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    const point = points.get(day);
    if (!point) continue;
    point.orders += 1;
    if (row.payment_status === "PAID") point.paid += 1;
  }

  return [...points.values()];
}
