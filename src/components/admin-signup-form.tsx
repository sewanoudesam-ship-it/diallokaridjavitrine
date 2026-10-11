"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import { AUTH_REQUEST_TIMEOUT_MS, withTimeout } from "@/src/lib/with-timeout";
import { buildAdminSignupRedirect, normalizeAdminSignupEmail, validateAdminSignupInput } from "@/src/lib/admin-signup";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const GENERIC_MESSAGE = "Si l’adresse peut être utilisée, un lien de confirmation vient d’être envoyé. Consultez votre boîte de réception et vos courriers indésirables.";

function signupError(error: unknown): string {
  if (error instanceof Error && error.message === "AUTH_REQUEST_TIMEOUT") {
    return "Le service met plus de temps que prévu à répondre. Vérifiez votre boîte avant de recommencer; le lien peut tout de même arriver.";
  }
  if (typeof error === "object" && error !== null) {
    const authError = error as { status?: number; code?: string; message?: string };
    const code = authError.code?.toLowerCase() ?? "";
    const message = authError.message?.toLowerCase() ?? "";
    if (authError.status === 429 || code.includes("rate_limit")) return "L’envoi de courriels est temporairement limité. Attendez avant de réessayer et vérifiez vos courriers indésirables.";
    if (message.includes("redirect") || code.includes("redirect")) return "Le retour sécurisé de confirmation n’est pas correctement configuré. Réessayez plus tard.";
  }
  return "L’inscription n’a pas pu être traitée. Vérifiez les informations puis réessayez plus tard.";
}

export function AdminSignupForm({ adminBasePath }: { adminBasePath: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validationError = validateAdminSignupInput(firstName, lastName, email);
    if (validationError === "FIRST_NAME_INVALID") { setError("Saisissez un prénom valide."); return; }
    if (validationError === "LAST_NAME_INVALID") { setError("Saisissez un nom valide."); return; }
    if (validationError === "EMAIL_INVALID") { setError("Saisissez une adresse e-mail valide."); return; }
    const client = getSupabaseBrowserClient();
    if (!client) { setError("Le service d’authentification n’est pas disponible."); return; }

    setBusy(true);
    try {
      const normalizedEmail = normalizeAdminSignupEmail(email);
      const redirectTo = buildAdminSignupRedirect(process.env.NEXT_PUBLIC_SITE_URL, window.location.origin);
      const { error: signupErrorResult } = await withTimeout(
        client.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectTo,
            data: { first_name: firstName.trim(), last_name: lastName.trim() },
          },
        }),
        AUTH_REQUEST_TIMEOUT_MS,
      );
      if (signupErrorResult) throw signupErrorResult;
      setSent(true);
    } catch (requestError) {
      setError(signupError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {sent ? (
        <div className="form-success" role="status" aria-live="polite">
          <p>{GENERIC_MESSAGE}</p>
          <p>Après confirmation de votre adresse, votre compte sera activé avec les autorisations administratives.</p>
          <button className="text-button" type="button" onClick={() => { setError(""); setSent(false); }}>Revenir au formulaire</button>
        </div>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          {!configured && <p className="notice field-full">L’authentification Supabase n’est pas encore configurée.</p>}
          <div className="field">
            <label htmlFor="admin-signup-first-name">Prénom</label>
            <input id="admin-signup-first-name" name="first_name" type="text" autoComplete="given-name" required maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="admin-signup-last-name">Nom</label>
            <input id="admin-signup-last-name" name="last_name" type="text" autoComplete="family-name" required maxLength={80} value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </div>
          <div className="field field-full">
            <label htmlFor="admin-signup-email">Adresse e-mail</label>
            <input id="admin-signup-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {error && <p className="form-error field-full" role="alert">{error}</p>}
          <div className="field-full"><button className="button" type="submit" disabled={!configured || busy}>{busy ? "Envoi du lien…" : "Recevoir le lien de confirmation"}</button></div>
        </form>
      )}
      <p className="form-note">Le compte devient administrateur après confirmation de l’adresse e-mail. Un nouveau lien peut être demandé si nécessaire.</p>
      <Link className="text-link" href={`${adminBasePath}/connexion`}>Retour à la connexion</Link>
    </>
  );
}
