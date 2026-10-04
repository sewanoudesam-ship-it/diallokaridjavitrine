import { NextRequest, NextResponse } from "next/server";
import { toPublicAdminPath } from "@/src/lib/admin-route";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";

function privateResponse(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function restartRecovery(request: NextRequest): NextResponse {
  // This public page offers a way to restart without disclosing the opaque admin path.
  return privateResponse(NextResponse.redirect(new URL("/auth/confirm?restart=1", request.url), 303));
}

export async function GET(request: NextRequest) {
  try {
    const client = await getSupabaseServerClient();
    if (!client) return restartRecovery(request);

    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return restartRecovery(request);

    const { data: role, error: roleError } = await client.from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (roleError || role?.role !== "admin") return restartRecovery(request);

    const publicPath = toPublicAdminPath("/admin/reinitialiser-mot-de-passe");
    if (!publicPath) return restartRecovery(request);

    return privateResponse(NextResponse.redirect(new URL(publicPath, request.url), 303));
  } catch {
    return restartRecovery(request);
  }
}
