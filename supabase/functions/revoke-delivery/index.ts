import { jsonResponse, optionsResponse, originAllowed, readJson, serveEdge } from "../_shared/http.ts";
import { requireAdmin } from "../_shared/supabase.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serveEdge(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!originAllowed(request)) return jsonResponse(request, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const body = await readJson(request);
    const deliveryId = typeof body.delivery_id === "string" ? body.delivery_id : "";
    if (!UUID_RE.test(deliveryId)) return jsonResponse(request, { error: "Identifiant d’accès invalide." }, 400);
    const { client, userId } = await requireAdmin(request);
    const { data, error } = await client.rpc("revoke_book_delivery", { p_delivery_id: deliveryId, p_actor_id: userId });
    if (error) throw new Error("REVOCATION_FAILED");
    if (data !== true) return jsonResponse(request, { error: "Cet accès n’existe pas ou a déjà été supprimé." }, 404);
    return jsonResponse(request, { revoked: true, delivery_id: deliveryId, revoked_by_user_id: userId, revoked_at: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" || message === "AUTH_INVALID" ? 401 : message === "ADMIN_REQUIRED" ? 403 : message.startsWith("JSON_") || message.startsWith("INVALID_") ? 400 : 503;
    return jsonResponse(request, { error: status === 401 ? "Reconnectez-vous à l’administration." : status === 403 ? "Accès administrateur requis." : status === 400 ? "La demande n’est pas valide." : "L’accès n’a pas pu être révoqué." }, status);
  }
});
