import { runtimeEnv, serveEdge } from "./runtime.ts";
export { serveEdge };

const APP_BASE_URL = runtimeEnv("APP_BASE_URL")?.trim();
const EXTRA_ORIGINS = (runtimeEnv("APP_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function configuredOrigins(): Set<string> {
  const origins = new Set(EXTRA_ORIGINS);
  if (APP_BASE_URL) {
    try { origins.add(new URL(APP_BASE_URL).origin); } catch { /* invalid configuration is rejected by appBaseUrl() */ }
  }
  return origins;
}

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = configuredOrigins();
  if (allowed.has(origin)) return true;
  if (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000") return true;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".manus.computer");
  } catch {
    return false;
  }
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "private, no-store, max-age=0",
  };
}

export function optionsResponse(request: Request): Response {
  if (!originAllowed(request)) return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  if (!originAllowed(request)) {
    return new Response(JSON.stringify({ error: "ORIGIN_NOT_ALLOWED" }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store, max-age=0" },
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function readJson(request: Request, maxBytes = 65536): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new Error("REQUEST_TOO_LARGE");
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("JSON_REQUIRED");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("REQUEST_TOO_LARGE");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("JSON_INVALID"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}

export function appBaseUrl(): string {
  const raw = runtimeEnv("APP_BASE_URL")?.trim();
  if (!raw) throw new Error("APP_BASE_URL_REQUIRED");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("APP_BASE_URL_INVALID"); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("APP_BASE_URL_INVALID");
  }
  return url.origin;
}
