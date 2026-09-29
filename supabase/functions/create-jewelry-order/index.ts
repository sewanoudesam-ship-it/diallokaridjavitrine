import { jsonResponse, optionsResponse, originAllowed, readJson } from "../_shared/http.ts";
import { validateEcowasPhone } from "../_shared/phone.ts";
import { getServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!originAllowed(request)) return jsonResponse(request, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await readJson(request);
    const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    const phone = validateEcowasPhone(body.phone_e164, body.country_iso);
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
      return jsonResponse(request, { error: "Le panier n’est pas valide." }, 400);
    }
    const items = body.items.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("INVALID_ITEMS");
      const value = entry as Record<string, unknown>;
      if (typeof value.product_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.product_id)) throw new Error("INVALID_ITEMS");
      if (!Number.isInteger(value.quantity) || Number(value.quantity) < 1 || Number(value.quantity) > 99) throw new Error("INVALID_ITEMS");
      return { product_id: value.product_id, quantity: Number(value.quantity) };
    });

    const client = getServiceClient();
    const { data, error } = await client.rpc("create_jewelry_order", {
      p_customer_name: customerName,
      p_phone_e164: phone.e164,
      p_country_iso: phone.country,
      p_email: email,
      p_items: items,
    });
    if (error) {
      const status = error.code === "P0002" ? 409 : error.code === "22023" ? 400 : 409;
      return jsonResponse(request, { error: status === 400 ? "Vérifiez les informations saisies." : "Un article a changé ou le contact WhatsApp n’est pas configuré. Vérifiez le panier." }, status);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id || !row.order_number || row.payment_status !== "PENDING" || !row.admin_whatsapp_e164) {
      return jsonResponse(request, { error: "La commande n’a pas pu être enregistrée." }, 500);
    }
    const { data: orderItems, error: itemsError } = await client
      .from("order_items")
      .select("item_name_snapshot,quantity")
      .eq("order_id", row.id)
      .order("created_at", { ascending: true });
    if (itemsError || !orderItems?.length) {
      // A failed response must not invite the customer to act on a partial message.
      return jsonResponse(request, { error: "La commande a été enregistrée, mais le message n’a pas pu être préparé. Contactez Maison Karidja." }, 503);
    }
    return jsonResponse(request, {
      order_number: row.order_number,
      payment_status: "PENDING",
      admin_whatsapp_e164: row.admin_whatsapp_e164,
      total_amount: Number(row.total_amount),
      currency: row.currency,
      items: orderItems.map((item) => ({ name: item.item_name_snapshot, quantity: item.quantity })),
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "REQUEST_TOO_LARGE" ? 413 : message === "JSON_REQUIRED" || message === "JSON_OBJECT_REQUIRED" || message.startsWith("INVALID_") || message.startsWith("UNSUPPORTED_") ? 400 : 503;
    const publicMessage = status === 400 ? "Vérifiez le pays, le numéro WhatsApp, les articles et les quantités." : status === 413 ? "La demande est trop volumineuse." : "Le service de commande est temporairement indisponible.";
    return jsonResponse(request, { error: publicMessage }, status);
  }
});
