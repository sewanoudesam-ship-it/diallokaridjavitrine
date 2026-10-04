"use client";

import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { parseAuthCallback } from "@/src/lib/auth-callback";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

type CallbackState = "checking" | "invalid" | "unavailable";

const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function AuthConfirmClient() {
  const [state, setState] = useState<CallbackState>(authConfigured ? "checking" : "unavailable");

  useEffect(() => {
    let active = true;
    const callback = parseAuthCallback(window.location.search, window.location.hash);

    // Capture credentials first, then immediately remove the query and fragment from browser history.
    window.history.replaceState(window.history.state, "", window.location.pathname);

    const verify = async () => {
      await Promise.resolve();
      if (!active) return;

      if (callback.hasError) {
        setState("invalid");
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) {
        setState("unavailable");
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
        setState("invalid");
        return;
      }

      if (!active) return;
      if (authError) {
        setState("invalid");
        return;
      }

      const { data, error } = await client.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        setState("invalid");
        return;
      }

      // The private destination is disclosed only after Supabase has verified the user session.
      window.location.replace("/auth/confirm/complete");
    };

    void verify().catch(() => {
      if (active) setState("unavailable");
    });

    return () => {
      active = false;
    };
  }, []);

  const heading = state === "checking"
    ? "Vérification du lien"
    : state === "invalid"
      ? "Lien invalide ou expiré"
      : "Service momentanément indisponible";
  const message = state === "checking"
    ? "Vérification sécurisée de votre lien…"
    : state === "invalid"
      ? "Ce lien ne peut plus être utilisé. Rendez-vous à votre accès administrateur et demandez un nouveau lien de récupération."
      : "La vérification n’a pas pu aboutir pour le moment. Réessayez dans quelques instants.";

  return (
    <section className="content-page container">
      <div className="content-narrow" aria-live="polite" aria-busy={state === "checking"}>
        <span className="eyebrow">Espace sécurisé</span>
        <h1 className="display page-title">{heading}</h1>
        <p className="muted">{message}</p>
      </div>
    </section>
  );
}
