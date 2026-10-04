"use client";

import { useEffect } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cleanAuthCallbackUrl, parseAuthCallback } from "@/src/lib/auth-callback";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

function completionUrl(): string {
  return new URL("/auth/confirm/complete", window.location.origin).toString();
}

export function AuthConfirmClient() {
  useEffect(() => {
    const callback = parseAuthCallback(window.location.search, window.location.hash);
    window.history.replaceState(window.history.state, "", cleanAuthCallbackUrl(window.location.pathname));

    const client = getSupabaseBrowserClient();
    const finish = () => window.location.replace(completionUrl());
    if (!client) {
      finish();
      return;
    }

    let active = true;
    const complete = () => {
      if (active) finish();
    };

    void (async () => {
      if (callback.hasError) {
        complete();
        return;
      }

      let authError: Error | null = null;
      if (callback.code) {
        const result = await client.auth.exchangeCodeForSession(callback.code);
        authError = result.error;
      } else if (callback.tokenHash && callback.type) {
        const result = await client.auth.verifyOtp({
          token_hash: callback.tokenHash,
          type: callback.type as EmailOtpType,
        });
        authError = result.error;
      } else if (callback.accessToken && callback.refreshToken) {
        const result = await client.auth.setSession({
          access_token: callback.accessToken,
          refresh_token: callback.refreshToken,
        });
        authError = result.error;
      } else {
        complete();
        return;
      }

      if (authError) {
        complete();
        return;
      }

      const { data, error } = await client.auth.getUser();
      if (error || !data.user) {
        complete();
        return;
      }
      complete();
    })().catch(complete);

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="content-page container">
      <div className="content-narrow" aria-live="polite" aria-busy="true">
        <span className="eyebrow">Espace sécurisé</span>
        <h1 className="display page-title">Vérification du lien</h1>
        <p className="muted">Vérification sécurisée de votre lien…</p>
      </div>
    </section>
  );
}
