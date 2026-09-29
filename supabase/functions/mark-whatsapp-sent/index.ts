import { jsonResponse, optionsResponse, originAllowed, readJson, serveEdge } from "../_shared/http.ts";
import { requireAdmin } from "../_shared/supabase.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serveEdge(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!originAllowed(request)) return jsonResponse(request, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const body = await readJson(request);
    const messageId = typeof body.message_id === "string" ? body.message_id : "";
    if (!UUID_RE.test(messageId)) return jsonResponse(request, { error: "Identifiant de message invalide." }, 400);
    const { client, userId } = await requireAdmin(request);
    const { data, error } = await client.rpc("mark_whatsapp_message_sent", { p_message_id: messageId, p_actor_id: userId });
    if (error) throw new Error("WHATSAPP_AUDIT_FAILED");
    if (data !== true) return jsonResponse(request, { error: "Ce message est déjà marqué comme envoyé ou n’existe pas." }, 409);
    return jsonResponse(request, { sent: true, message_id: messageId, sent_by_user_id: userId, sent_at: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" || message === "AUTH_INVALID" ? 401 : message === "ADMIN_REQUIRED" ? 403 : message.startsWith("JSON_") || message.startsWith("INVALID_") ? 400 : 503;
    return jsonResponse(request, { error: status === 401 ? "Reconnectez-vous à l’administration." : status === 403 ? "Accès administrateur requis." : status === 400 ? "La demande n’est pas valide." : "L’envoi n’a pas pu être consigné." }, status);
  }
});
