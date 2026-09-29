import { jsonResponse, optionsResponse, originAllowed, readJson, serveEdge } from "../_shared/http.ts";
import { validateEcowasPhone } from "../_shared/phone.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serveEdge(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!originAllowed(request)) return jsonResponse(request, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await readJson(request);
    const bookId = typeof body.book_id === "string" ? body.book_id : "";
    const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    if (!UUID_RE.test(bookId)) return jsonResponse(request, { error: "Fiche du livre invalide." }, 400);
    const phone = validateEcowasPhone(body.phone_e164, body.country_iso);
    const client = getServiceClient();
    const { data, error } = await client.rpc("create_book_order", {
      p_book_id: bookId,
      p_customer_name: customerName,
      p_phone_e164: phone.e164,
      p_country_iso: phone.country,
      p_email: email,
    });
    if (error) {
      const status = error.code === "P0002" ? 404 : error.code === "22023" ? 400 : 409;
      return jsonResponse(request, { error: status === 404 ? "Cette fiche n’est plus disponible à la commande." : "Les informations de commande ne sont pas valides." }, status);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.order_number || row.payment_status !== "PENDING") return jsonResponse(request, { error: "La commande n’a pas pu être enregistrée." }, 500);
    const { data: settings } = await client.from("site_settings").select("payment_instructions,admin_whatsapp_e164").eq("singleton", true).maybeSingle();
    return jsonResponse(request, {
      order_number: row.order_number,
      payment_status: "PENDING",
      payment_instructions: settings?.payment_instructions ?? null,
      admin_whatsapp_e164: settings?.admin_whatsapp_e164 ?? null,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "REQUEST_TOO_LARGE" ? 413 : message.startsWith("JSON_") ? 400 : message.startsWith("INVALID_") || message.startsWith("UNSUPPORTED_") ? 400 : 503;
    const publicMessage = status === 400 ? "Vérifiez le pays, le numéro WhatsApp et les informations saisies." : status === 413 ? "La demande est trop volumineuse." : "Le service de commande est temporairement indisponible.";
    return jsonResponse(request, { error: publicMessage }, status);
  }
});
