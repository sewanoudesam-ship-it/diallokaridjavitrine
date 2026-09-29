"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/lib/supabase/database.types";

type BrowserClient = SupabaseClient<Database, "public">;
let browserClient: BrowserClient | null | undefined;

export function getSupabaseBrowserClient(): BrowserClient | null {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    browserClient = null;
    return null;
  }
  const client = createBrowserClient<Database>(url, anonKey);
  browserClient = client;
  return client;
}
