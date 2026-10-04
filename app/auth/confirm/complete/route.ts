import { NextRequest, NextResponse } from "next/server";
import { toPublicAdminPath } from "@/src/lib/admin-route";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";

function redirectTo(request: NextRequest, internalPath: string): NextResponse {
  const publicPath = toPublicAdminPath(internalPath) ?? "/";
  const response = NextResponse.redirect(new URL(publicPath, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function GET(request: NextRequest) {
  const client = await getSupabaseServerClient();
  if (!client) return redirectTo(request, "/admin/connexion?auth=unavailable");

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    return redirectTo(request, "/admin/mot-de-passe-oublie?auth=invalid-link");
  }

  return redirectTo(request, "/admin/reinitialiser-mot-de-passe?confirmed=1");
}
