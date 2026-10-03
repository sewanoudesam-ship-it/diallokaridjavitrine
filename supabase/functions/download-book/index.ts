import { corsHeaders, jsonResponse, optionsResponse, originAllowed, readJson, serveEdge } from "../_shared/http.ts";
import { hashSecret, isValidAccessCode } from "../_shared/crypto.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;

function clientAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-real-ip")?.trim();
  return address && address.length <= 128 && !/[\s,]/.test(address) ? address : null;
}

serveEdge(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!originAllowed(request)) return jsonResponse(request, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const address = clientAddress(request);
    if (!address) throw new Error("CLIENT_IP_UNAVAILABLE");
    const client = getServiceClient();
    const { data: limitData, error: limitError } = await client.rpc("consume_download_rate_limit", {
      p_client_ip_hash: await hashSecret(`download-ip:${address}`),
    });
    const limit = Array.isArray(limitData) ? limitData[0] : limitData;
    if (limitError || !limit) throw new Error("RATE_LIMIT_UNAVAILABLE");
    if (!limit.allowed) {
      const response = jsonResponse(request, { error: "Trop de tentatives. Réessayez plus tard." }, 429);
      response.headers.set("Retry-After", String(Math.max(1, limit.retry_after_seconds)));
      return response;
    }

    const body = await readJson(request, 4096);
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const rawCode = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    if (Boolean(token) === Boolean(rawCode)) return jsonResponse(request, { error: "Saisissez un code ou utilisez votre lien personnel." }, 400);
    let query = getServiceClient().from("digital_deliveries").select("id,order_id,pdf_storage_path,revoked_at");
    if (token) {
      if (!TOKEN_RE.test(token)) return jsonResponse(request, { error: "Lien ou code invalide, expiré ou révoqué." }, 404);
      query = query.eq("access_token_hash", await hashSecret(`token:${token}`));
    } else {
      if (!isValidAccessCode(rawCode)) return jsonResponse(request, { error: "Lien ou code invalide, expiré ou révoqué." }, 404);
      query = query.eq("access_code_hash", await hashSecret(`code:${rawCode}`));
    }
    const { data: delivery, error: deliveryError } = await query.maybeSingle();
    if (deliveryError || !delivery || delivery.revoked_at) return jsonResponse(request, { error: "Lien ou code invalide, expiré ou révoqué." }, 404);

    const { data: access, error: accessError } = await client
      .from("download_access")
      .select("id,downloaded_count,max_downloads,expires_at,revoked_at")
      .eq("delivery_id", delivery.id)
      .maybeSingle();
    if (accessError || !access) return jsonResponse(request, { error: "Lien ou code invalide, expiré ou révoqué." }, 404);

    // Fetch from private storage before consuming the request, but never expose a reusable signed URL.
    const { data: file, error: fileError } = await client.storage.from("book-personalized").download(delivery.pdf_storage_path);
    if (fileError || !file) return jsonResponse(request, { error: "Le fichier n’est temporairement pas disponible." }, 503);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { data: result, error: consumeError } = await client.rpc("consume_download_access", { p_access_id: access.id });
    const row = Array.isArray(result) ? result[0] : result;
    if (consumeError || !row?.allowed) return jsonResponse(request, { error: "Lien ou code invalide, expiré, révoqué ou ayant atteint sa limite." }, 403);
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=maison-karidja-livre.pdf",
        "Content-Length": String(bytes.byteLength),
        "X-Download-Number": String(row.download_number),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "REQUEST_TOO_LARGE" ? 413 : message.startsWith("JSON_") ? 400 : 503;
    return jsonResponse(request, { error: status === 413 ? "La demande est trop volumineuse." : status === 400 ? "La demande n’est pas valide." : "L’accès n’a pas pu être vérifié." }, status);
  }
});
