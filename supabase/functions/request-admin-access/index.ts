import { createClient } from "@supabase/supabase-js";

const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_HASH_PREFIX = "maison-karidja:admin-code:v1:";
const GENERIC_MESSAGE = "Si le code est actif et correspond à cette adresse, un e-mail d’invitation a été envoyé. Consultez aussi vos courriers indésirables.";

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return "*";
  const configured = Deno.env.get("APP_BASE_URL")?.trim();
  if (!configured) return null;
  try { return new URL(configured).origin === origin ? origin : null; } catch { return null; }
}

function responseHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "private, no-store, max-age=0",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  const origin = allowedOrigin(request);
  if (!origin) return new Response(JSON.stringify({ error: "ORIGIN_NOT_ALLOWED" }), { status: 403, headers: { "Cache-Control": "no-store" } });
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 2048) throw new Error("REQUEST_TOO_LARGE");
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("JSON_REQUIRED");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 2048) throw new Error("REQUEST_TOO_LARGE");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("JSON_INVALID"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}

async function hashAdminCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${CODE_HASH_PREFIX}${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function genericAccepted(request: Request): Response {
  return jsonResponse(request, { accepted: true, message: GENERIC_MESSAGE }, 202);
}

Deno.serve(async (request: Request) => {
  const origin = allowedOrigin(request);
  if (!origin) return new Response(JSON.stringify({ error: "ORIGIN_NOT_ALLOWED" }), { status: 403, headers: { "Cache-Control": "no-store" } });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(origin) });
  if (request.method !== "POST") return jsonResponse(request, { error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await readBody(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!EMAIL_PATTERN.test(email) || email.length > 254 || !CODE_PATTERN.test(code)) return genericAccepted(request);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const appBase = Deno.env.get("APP_BASE_URL")?.trim();
    if (!supabaseUrl || !serviceRoleKey || !appBase) throw new Error("FUNCTION_ENV_REQUIRED");
    const parsedBase = new URL(appBase);
    if (parsedBase.protocol !== "https:" || parsedBase.pathname !== "/" || parsedBase.search || parsedBase.hash || parsedBase.username || parsedBase.password) {
      throw new Error("APP_BASE_URL_INVALID");
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const codeHash = await hashAdminCode(code);
    const { data: valid, error: validationError } = await client.rpc("validate_admin_access_code", {
      p_code_hash: codeHash,
      p_email: email,
    });
    if (validationError) throw new Error("ACCESS_VALIDATION_UNAVAILABLE");
    if (!valid) return genericAccepted(request);

    const redirectTo = `${parsedBase.origin}/auth/confirm`;
    const { data, error: inviteError } = await client.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteError || !data.user) return genericAccepted(request);

    const { error: consumeError } = await client.rpc("consume_admin_access_code", {
      p_code_hash: codeHash,
      p_email: email,
      p_user_id: data.user.id,
    });
    if (consumeError) throw new Error("ACCESS_FINALIZATION_UNAVAILABLE");
    return genericAccepted(request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN";
    const status = reason.startsWith("JSON_") || reason === "REQUEST_TOO_LARGE" ? 400 : 503;
    const message = status === 400 ? "La demande n’est pas valide." : "Le service d’activation est temporairement indisponible. Réessayez plus tard.";
    return jsonResponse(request, { error: message }, status);
  }
});
