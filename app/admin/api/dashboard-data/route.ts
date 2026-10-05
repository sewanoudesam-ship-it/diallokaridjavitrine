import { NextRequest, NextResponse } from "next/server";
import { buildDailyOrderTrend } from "@/src/lib/admin-dashboard";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const client = await getSupabaseServerClient();
    if (!client) return json({ error: "SERVICE_UNAVAILABLE" }, 503);

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return json({ error: "UNAUTHORIZED" }, 401);

    const { data: role, error: roleError } = await client.from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (roleError || role?.role !== "admin") return json({ error: "FORBIDDEN" }, 403);

    const days = Number(request.nextUrl.searchParams.get("days") ?? 30);
    if (![7, 30, 90].includes(days)) return json({ error: "INVALID_RANGE" }, 400);

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const since = new Date(today);
    since.setUTCDate(today.getUTCDate() - days + 1);
    const sinceIso = since.toISOString();

    const [ordersResult, paidCountResult, pendingCountResult, booksResult, productsResult, deliveriesResult, whatsappResult] = await Promise.all([
      client.from("orders")
        .select("created_at,payment_status", { count: "exact" })
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(5000),
      client.from("orders").select("id", { count: "exact", head: true }).gte("created_at", sinceIso).eq("payment_status", "PAID"),
      client.from("orders").select("id", { count: "exact", head: true }).gte("created_at", sinceIso).eq("payment_status", "PENDING"),
      client.from("books").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
      client.from("products").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
      client.from("digital_deliveries").select("id", { count: "exact", head: true }).is("revoked_at", null),
      client.from("whatsapp_messages").select("id", { count: "exact", head: true }).is("sent_at", null),
    ]);

    if (ordersResult.error || paidCountResult.error || pendingCountResult.error || booksResult.error || productsResult.error || deliveriesResult.error || whatsappResult.error) {
      return json({ error: "METRICS_UNAVAILABLE" }, 503);
    }

    const orders = ordersResult.data ?? [];

    return json({
      days,
      updatedAt: now.toISOString(),
      totals: {
        orders: ordersResult.count ?? 0,
        paidOrders: paidCountResult.count ?? 0,
        pendingPayments: pendingCountResult.count ?? 0,
        publishedBooks: booksResult.count ?? 0,
        publishedProducts: productsResult.count ?? 0,
        nonRevokedDeliveries: deliveriesResult.count ?? 0,
        whatsappPending: whatsappResult.count ?? 0,
      },
      trend: buildDailyOrderTrend(orders, days, now),
      truncated: (ordersResult.count ?? 0) > orders.length,
    });
  } catch {
    return json({ error: "METRICS_UNAVAILABLE" }, 503);
  }
}
