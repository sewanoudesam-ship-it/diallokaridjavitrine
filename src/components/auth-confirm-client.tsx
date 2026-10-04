"use client";

import { useEffect, useRef, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AdminPasswordRequestForm } from "@/src/components/admin-password-request-form";
import { hasAuthCallbackCredentials, parseAuthCallback, type AuthCallbackOtpType, type ParsedAuthCallback } from "@/src/lib/auth-callback";
import { AUTH_REQUEST_TIMEOUT_MS, withTimeout } from "@/src/lib/with-timeout";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

type CallbackState = "preparing" | "ready" | "verifying" | "invalid" | "unavailable";

const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function AuthConfirmClient() {
  const [state, setState] = useState<CallbackState>(authConfigured ? "preparing" : "unavailable");
  const [canRetryVerification, setCanRetryVerification] = useState(false);
  const [callbackType, setCallbackType] = useState<AuthCallbackOtpType | null>(null);
  const callbackRef = useRef<ParsedAuthCallback | null>(null);

  useEffect(() => {
    let active = true;
    // Keep the callback in a ref so React Strict Mode's second effect pass still
    // has the credentials after they have been removed from the address bar.
    const callback = callbackRef.current ?? parseAuthCallback(window.location.search, window.location.hash);
    callbackRef.current = callback;
    window.history.replaceState(window.history.state, "", window.location.pathname);

    void Promise.resolve().then(() => {
      if (!active) return;
      setCallbackType(callback.type);
      if (!authConfigured) {
        setState("unavailable");
      } else if (callback.hasError || !hasAuthCallbackCredentials(callback)) {
        setCanRetryVerification(false);
        setState("invalid");
      } else {
        setCanRetryVerification(true);
        // Do not verify a one-time email token on page load. Some email security
        // scanners open links automatically; verification waits for the user's click.
        setState("ready");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function verifyLink() {
    const callback = callbackRef.current;
    if (!callback || callback.hasError || !hasAuthCallbackCredentials(callback)) {
      setState("invalid");
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setState("unavailable");
      return;
    }

    setState("verifying");
    try {
      let authError: Error | null = null;
      if (callback.code) {
        const result = await withTimeout(client.auth.exchangeCodeForSession(callback.code), AUTH_REQUEST_TIMEOUT_MS);
        authError = result.error;
      } else if (callback.tokenHash && callback.type) {
        const result = await withTimeout(client.auth.verifyOtp({
          token_hash: callback.tokenHash,
          type: callback.type as EmailOtpType,
        }), AUTH_REQUEST_TIMEOUT_MS);
        authError = result.error;
      } else if (callback.accessToken && callback.refreshToken) {
        const result = await withTimeout(client.auth.setSession({
          access_token: callback.accessToken,
          refresh_token: callback.refreshToken,
        }), AUTH_REQUEST_TIMEOUT_MS);
        authError = result.error;
      } else {
        setState("invalid");
        return;
      }

      if (authError) {
        setState("invalid");
        return;
      }

      const { data, error } = await withTimeout(client.auth.getUser(), AUTH_REQUEST_TIMEOUT_MS);
      if (error || !data.user) {
        setState("invalid");
        return;
      }

      // The private destination is disclosed only after Supabase has verified the user session.
      window.location.replace("/auth/confirm/complete");
    } catch {
      setState("unavailable");
    }
  }

  const isInvitation = callbackType === "invite";
  const heading = state === "preparing"
    ? "Préparation du lien sécurisé"
    : state === "ready"
      ? isInvitation ? "Confirmer l’invitation" : "Confirmer le lien de récupération"
      : state === "verifying"
        ? "Vérification en cours"
        : state === "invalid"
          ? "Lien expiré ou déjà utilisé"
          : "Vérification momentanément indisponible";

  const message = state === "preparing"
    ? "Le lien n’est pas utilisé automatiquement. Préparation de la confirmation…"
    : state === "ready"
      ? isInvitation
        ? "Pour éviter qu’un contrôle automatique de votre boîte e-mail n’utilise le lien à votre place, confirmez ici pour accepter l’invitation et définir votre mot de passe."
        : "Pour éviter qu’un contrôle automatique de votre boîte e-mail n’utilise le lien à votre place, confirmez ici pour continuer."
      : state === "verifying"
        ? "Nous vérifions le lien auprès du service sécurisé. Cette étape peut prendre quelques secondes."
        : state === "invalid"
          ? "Ce lien ne peut plus être utilisé. Vous pouvez demander un nouvel e-mail ci-dessous, sans revenir à la page d’administration."
          : "Le service n’a pas répondu à temps. Vous pouvez réessayer la vérification ou demander un nouveau lien ci-dessous.";

  return (
    <section className="content-page container">
      <div className="content-narrow" aria-live="polite" aria-busy={state === "preparing" || state === "verifying"}>
        <span className="eyebrow">Espace sécurisé</span>
        <h1 className="display page-title">{heading}</h1>
        <p className="muted">{message}</p>

        {state === "ready" && (
          <button className="button" type="button" onClick={verifyLink}>
            {isInvitation ? "Accepter l’invitation et définir mon mot de passe" : "Confirmer et choisir un nouveau mot de passe"}
          </button>
        )}
        {state === "unavailable" && canRetryVerification && (
          <p><button className="button" type="button" onClick={verifyLink}>Réessayer la vérification</button></p>
        )}
        {(state === "invalid" || state === "unavailable") && (
          <div className="admin-panel">
            <h2>Demander un autre lien</h2>
            <AdminPasswordRequestForm />
          </div>
        )}
      </div>
    </section>
  );
}
