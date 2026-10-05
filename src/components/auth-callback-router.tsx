"use client";

import { useEffect } from "react";
import { shouldRedirectAuthCallback } from "@/src/lib/auth-callback";

/** Route Supabase email links that land on Site URL back through the private callback. */
export function AuthCallbackRouter() {
  useEffect(() => {
    if (!shouldRedirectAuthCallback(window.location.pathname, window.location.search, window.location.hash)) return;
    window.location.replace(`/auth/confirm${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}
