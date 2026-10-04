"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import { AUTH_REQUEST_TIMEOUT_MS, withTimeout } from "@/src/lib/with-timeout";

type AdminPasswordRequestFormProps = {
  adminBasePath?: string;
};

function recoveryRequestError(error: unknown): string {
  if (error instanceof Error && error.message === "AUTH_REQUEST_TIMEOUT") {
    return "Le service met plus de temps que prévu à répondre. Vous pouvez réessayer; un e-mail peut tout de même arriver si la demande a abouti.";
  }
  if (typeof error === "object" && error !== null) {
    const authError = error as { status?: number; code?: string; message?: string };
    if (authError.status === 429 || authError.code?.toLowerCase().includes("rate_limit")) {
      return "Supabase a temporairement bloqué l’envoi. Avec le SMTP par défaut, tous les e-mails Auth du projet partagent un plafond de 2 par heure; une demande de récupération doit aussi être espacée d’au moins 60 secondes. Si le quota horaire est épuisé, réessayez plus tard. Un SMTP personnalisé est nécessaire pour augmenter cette limite et améliorer la livraison.";
    }
    if (authError.message?.toLowerCase().includes("redirect") || authError.code?.toLowerCase().includes("redirect")) {
      return "Le retour sécurisé du lien n’est pas correctement configuré. Contactez l’administratrice du site.";
    }
  }
  return "La demande n’a pas pu être confirmée. Vérifiez l’adresse et votre connexion, puis réessayez.";
}

export function AdminPasswordRequestForm({ adminBasePath }: AdminPasswordRequestFormProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Saisissez l’adresse e-mail associée à votre compte administrateur.");
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Le service d’authentification n’est pas disponible. Réessayez plus tard.");
      return;
    }

    setBusy(true);
    try {
      const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      const redirectBase = configuredSiteUrl ? new URL(configuredSiteUrl) : new URL(window.location.origin);
      const redirectTo = new URL("/auth/confirm", redirectBase.origin).toString();
      const { error: resetError } = await withTimeout(
        client.auth.resetPasswordForEmail(normalizedEmail, { redirectTo }),
        AUTH_REQUEST_TIMEOUT_MS,
      );
      if (resetError) throw resetError;
      setEmail(normalizedEmail);
      setSent(true);
    } catch (requestError) {
      setError(recoveryRequestError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {sent ? (
        <div className="form-success" role="status" aria-live="polite">
          <p>Si un compte administrateur autorisé correspond à cette adresse, un e-mail de récupération a été demandé. Vérifiez la boîte de réception et les courriers indésirables.</p>
          <p>Vous n’avez rien reçu, ou le lien est expiré ? Vous pouvez demander un autre lien.</p>
          <button className="button" type="button" onClick={() => { setError(""); setSent(false); }}>
            Demander un autre lien
          </button>
        </div>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          <div className="field field-full">
            <label htmlFor="recovery-email">Adresse e-mail du compte</label>
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => { setEmail(event.target.value); setError(""); }}
            />
          </div>
          {error && <p className="form-error field-full" role="alert">{error}</p>}
          <div className="field-full">
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Envoi en cours…" : "Envoyer le lien de récupération"}
            </button>
          </div>
        </form>
      )}
      <p className="form-note">La réponse ne révèle pas si l’adresse existe. Vous devez déjà disposer d’un compte administrateur autorisé.</p>
      <p className="form-note">Avec le service e-mail Supabase par défaut, les e-mails Auth sont limités à 2 par heure au total; les demandes de récupération sont aussi espacées de 60 secondes. Évitez les demandes répétées et vérifiez les courriers indésirables.</p>
      {adminBasePath && <Link className="text-link" href={`${adminBasePath}/connexion`}>Retour à la connexion</Link>}
    </>
  );
}
