"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import { AUTH_REQUEST_TIMEOUT_MS, withTimeout } from "@/src/lib/with-timeout";
import {
  ADMIN_SIGNUP_MIN_PASSWORD_LENGTH,
  buildAdminSignupRedirect,
  normalizeAdminSignupEmail,
  validateAdminSignupInput,
} from "@/src/lib/admin-signup";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const GENERIC_MESSAGE = "Si cette adresse peut être utilisée, un e-mail de confirmation a été demandé. Consultez votre boîte de réception et vos courriers indésirables.";

function signupRequestError(error: unknown): string {
  if (error instanceof Error && error.message === "AUTH_REQUEST_TIMEOUT") {
    return "Le service met plus de temps que prévu à répondre. Vérifiez votre boîte avant de recommencer; un e-mail peut tout de même arriver.";
  }
  if (typeof error === "object" && error !== null) {
    const authError = error as { status?: number; code?: string; message?: string };
    const code = authError.code?.toLowerCase() ?? "";
    const message = authError.message?.toLowerCase() ?? "";
    if (authError.status === 429 || code.includes("rate_limit")) {
      return "L’envoi de courriels est temporairement limité. Attendez avant de réessayer et vérifiez aussi les courriers indésirables.";
    }
    if (message.includes("redirect") || code.includes("redirect")) {
      return "Le retour sécurisé de confirmation n’est pas correctement configuré. Réessayez plus tard.";
    }
    if (code.includes("weak_password") || message.includes("password")) {
      return `Le mot de passe ne respecte pas les règles de sécurité. Utilisez au moins ${ADMIN_SIGNUP_MIN_PASSWORD_LENGTH} caractères.`;
    }
  }
  return "L’inscription n’a pas pu être traitée. Vérifiez les informations puis réessayez plus tard.";
}

export function AdminSignupForm({ adminBasePath }: { adminBasePath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validationError = validateAdminSignupInput(email, password, confirmation);
    if (validationError === "EMAIL_INVALID") {
      setError("Saisissez une adresse e-mail valide.");
      return;
    }
    if (validationError === "PASSWORD_TOO_SHORT") {
      setError(`Le mot de passe doit contenir au moins ${ADMIN_SIGNUP_MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (validationError === "PASSWORD_MISMATCH") {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Le service d’authentification n’est pas disponible.");
      return;
    }

    setBusy(true);
    try {
      const redirectTo = buildAdminSignupRedirect(process.env.NEXT_PUBLIC_SITE_URL, window.location.origin);
      const { data, error: signupError } = await withTimeout(
        client.auth.signUp({
          email: normalizeAdminSignupEmail(email),
          password,
          options: { emailRedirectTo: redirectTo },
        }),
        AUTH_REQUEST_TIMEOUT_MS,
      );
      if (signupError) throw signupError;

      // A session here means email confirmation is disabled; fail closed and do
      // not leave a newly created administrator session in this browser.
      if (data.session) {
        await client.auth.signOut();
        setError("La confirmation de l’adresse e-mail n’est pas exigée par le service. L’accès administrateur reste bloqué jusqu’à activation de ce réglage.");
        return;
      }

      setEmail(normalizeAdminSignupEmail(email));
      setPassword("");
      setConfirmation("");
      setSent(true);
    } catch (requestError) {
      setError(signupRequestError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="notice" role="note">
        L’inscription est ouverte : toute personne qui confirme son adresse recevra les droits administrateur complets. Ne partagez pas ce lien avec une personne non autorisée.
      </p>
      {sent ? (
        <div className="form-success" role="status" aria-live="polite">
          <p>{GENERIC_MESSAGE}</p>
          <p>Le rôle administrateur ne sera actif qu’après confirmation de l’adresse dans le message reçu.</p>
          <button className="text-button" type="button" onClick={() => { setError(""); setSent(false); }}>
            Revenir au formulaire
          </button>
        </div>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          {!configured && <p className="notice field-full">L’authentification Supabase n’est pas encore configurée.</p>}
          <div className="field field-full">
            <label htmlFor="admin-signup-email">Adresse e-mail</label>
            <input id="admin-signup-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} />
          </div>
          <div className="field field-full">
            <label htmlFor="admin-signup-password">Mot de passe</label>
            <input id="admin-signup-password" name="password" type="password" autoComplete="new-password" required minLength={ADMIN_SIGNUP_MIN_PASSWORD_LENGTH} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} />
            <small>Au moins {ADMIN_SIGNUP_MIN_PASSWORD_LENGTH} caractères.</small>
          </div>
          <div className="field field-full">
            <label htmlFor="admin-signup-confirmation">Confirmer le mot de passe</label>
            <input id="admin-signup-confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={ADMIN_SIGNUP_MIN_PASSWORD_LENGTH} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} />
          </div>
          {error && <p className="form-error field-full" role="alert">{error}</p>}
          <div className="field-full"><button className="button" type="submit" disabled={!configured || busy}>{busy ? "Création du compte…" : "Créer mon compte et recevoir le lien"}</button></div>
        </form>
      )}
      <p className="form-note">La réponse ne révèle pas si l’adresse existe. Avec le SMTP Supabase par défaut, les e-mails Auth sont limités à 2 par heure au total.</p>
      <Link className="text-link" href={`${adminBasePath}/connexion`}>Retour à la connexion</Link>
    </>
  );
}
