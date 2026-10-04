import { NextRequest, NextResponse } from "next/server";
import { toPublicAdminPath } from "@/src/lib/admin-route";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";

function privateNotFound(status = 404): NextResponse {
  const response = new NextResponse("Not Found", { status });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export async function GET(request: NextRequest) {
  const client = await getSupabaseServerClient();
  if (!client) return privateNotFound(503);

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return privateNotFound();

  const { data: role, error: roleError } = await client.from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleError || role?.role !== "admin") return privateNotFound();

  const publicPath = toPublicAdminPath("/admin/reinitialiser-mot-de-passe");
  if (!publicPath) return privateNotFound();

  const response = NextResponse.redirect(new URL(publicPath, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
