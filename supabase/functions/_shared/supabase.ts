import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runtimeEnv } from "./runtime.ts";

export function getServiceClient(): SupabaseClient {
  const url = runtimeEnv("SUPABASE_URL");
  const serviceRoleKey = runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("SUPABASE_FUNCTION_ENV_REQUIRED");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function requireAdmin(request: Request): Promise<{ client: SupabaseClient; userId: string }> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("AUTH_REQUIRED");
  const client = getServiceClient();
  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user) throw new Error("AUTH_INVALID");
  const { data: role, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (roleError || role?.role !== "admin") throw new Error("ADMIN_REQUIRED");
  return { client, userId: data.user.id };
}
