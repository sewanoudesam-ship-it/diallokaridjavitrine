import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/lib/supabase/database.types";

type PublicClient = SupabaseClient<Database, "public">;
let publicClient: PublicClient | null | undefined;

export function getPublicSupabaseClient(): PublicClient | null {
  if (publicClient !== undefined) return publicClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    publicClient = null;
    return null;
  }
  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  publicClient = client;
  return client;
}
