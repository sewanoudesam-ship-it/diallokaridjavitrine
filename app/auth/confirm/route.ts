import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { toPublicAdminPath } from "@/src/lib/admin-route";

const CREDENTIAL_SETUP_FLOW = "credential-setup";

function adminLocation(internalPath: string): string {
  return toPublicAdminPath(internalPath) ?? "/";
}

function redirectTo(request: NextRequest, path: string, status = 303): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url), status);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function GET(request: NextRequest) {
  const flow = request.nextUrl.searchParams.get("flow");
  const target = flow === CREDENTIAL_SETUP_FLOW
    ? "/admin/reinitialiser-mot-de-passe?confirmed=1"
    : "/admin/connexion";
  const client = await getSupabaseServerClient();
  if (!client) return redirectTo(request, adminLocation("/admin/connexion?auth=unavailable"));

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let error: { message: string } | null = null;

  if (code) {
    const result = await client.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type && ["signup", "recovery", "invite", "magiclink", "email_change", "email"].includes(type)) {
    const result = await client.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    error = result.error;
  } else {
    return redirectTo(request, adminLocation("/admin/connexion?auth=invalid-link"));
  }

  if (error) {
    const failure = type === "recovery"
      ? "/admin/mot-de-passe-oublie?auth=invalid-link"
      : "/admin/inscription?auth=invalid-link";
    return redirectTo(request, adminLocation(failure));
  }

  return redirectTo(request, adminLocation(target));
}
