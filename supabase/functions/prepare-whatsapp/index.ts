import { appBaseUrl, jsonResponse, optionsResponse, originAllowed, readJson, serveEdge } from "../_shared/http.ts";
import { decryptSecret, hashSecret } from "../_shared/crypto.ts";
import { requireAdmin } from "../_shared/supabase.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serveEdge(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!originAllowed(request)) return jsonResponse(request, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await readJson(request);
    const orderId = typeof body.order_id === "string" ? body.order_id : "";
    if (!UUID_RE.test(orderId)) return jsonResponse(request, { error: "Identifiant de commande invalide." }, 400);
    const baseUrl = appBaseUrl();
    const { client, userId } = await requireAdmin(request);
    const { data: order, error: orderError } = await client
      .from("orders")
      .select("id,order_number,order_type,customer_name,phone_e164,payment_status,status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw new Error("ORDER_LOOKUP_FAILED");
    if (!order || order.order_type !== "BOOK" || order.payment_status !== "PAID" || order.status === "CANCELLED") {
      return jsonResponse(request, { error: "Aucun accès actif n’est disponible pour cette commande." }, 409);
    }
    const { data: delivery, error: deliveryError } = await client
      .from("digital_deliveries")
      .select("id,access_code_hash,access_code_ciphertext,access_token_hash,access_token_ciphertext,revoked_at,created_by,created_at")
      .eq("order_id", order.id)
      .maybeSingle();
    if (deliveryError || !delivery || delivery.revoked_at) return jsonResponse(request, { error: "Aucun accès actif n’est disponible pour cette commande." }, 409);
    const { data: access, error: accessError } = await client
      .from("download_access")
      .select("downloaded_count,max_downloads,expires_at,revoked_at")
      .eq("delivery_id", delivery.id)
      .maybeSingle();
    if (accessError || !access || access.revoked_at || access.downloaded_count >= access.max_downloads || (access.expires_at && new Date(access.expires_at).getTime() <= Date.now())) {
      return jsonResponse(request, { error: "L’accès est révoqué, expiré ou a atteint sa limite de téléchargements." }, 409);
    }

    const [code, token] = await Promise.all([
      decryptSecret(delivery.access_code_ciphertext),
      decryptSecret(delivery.access_token_ciphertext),
    ]);
    const [codeHash, tokenHash] = await Promise.all([hashSecret(`code:${code}`), hashSecret(`token:${token}`)]);
    if (codeHash !== delivery.access_code_hash || tokenHash !== delivery.access_token_hash) throw new Error("ACCESS_DATA_INTEGRITY_FAILED");
    const link = `${baseUrl}/telechargement?token=${encodeURIComponent(token)}`;
    const message = [
      "Bonjour, voici votre accès personnel au livre numérique de Maison Karidja.",
      `Commande : ${order.order_number}`,
      `Lien de téléchargement : ${link}`,
      `Code d’accès : ${code}`,
      `Cet accès permet jusqu’à ${access.max_downloads} téléchargements. Ne partagez pas ce lien ni ce code.`,
      "Maison Karidja",
    ].join("\n");
    const { data: messageId, error: logError } = await client.rpc("record_whatsapp_prepared", {
      p_order_id: order.id,
      p_actor_id: userId,
    });
    if (logError || !messageId) throw new Error("WHATSAPP_AUDIT_FAILED");
    const recipientDigits = order.phone_e164.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${recipientDigits}?text=${encodeURIComponent(message)}`;
    return jsonResponse(request, {
      message_id: messageId,
      order_number: order.order_number,
      recipient_e164: order.phone_e164,
      recipient_name: order.customer_name,
      access_code: code,
      access_link: link,
      message,
      whatsapp_url: whatsappUrl,
      prepared_by_user_id: userId,
      code_generated_by_user_id: delivery.created_by,
      code_generated_at: delivery.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" || message === "AUTH_INVALID" ? 401
      : message === "ADMIN_REQUIRED" ? 403
      : message.startsWith("JSON_") || message.startsWith("INVALID_") ? 400
      : message === "APP_BASE_URL_REQUIRED" || message === "APP_BASE_URL_INVALID" || message.startsWith("CODE_") ? 503
      : 503;
    const publicMessage = status === 401 ? "Reconnectez-vous à l’administration."
      : status === 403 ? "Accès administrateur requis."
      : status === 400 ? "La demande n’est pas valide."
      : "Le message n’a pas pu être préparé. Vérifiez la configuration de l’accès et réessayez.";
    return jsonResponse(request, { error: publicMessage }, status);
  }
});
