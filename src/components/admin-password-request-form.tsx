"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export function AdminPasswordRequestForm({ adminBasePath }: { adminBasePath: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Le service d’authentification n’est pas disponible.");
      return;
    }
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/confirm?flow=credential-setup`;
    try {
      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw new Error("RECOVERY_REQUEST_FAILED");
      setSent(true);
    } catch {
      setError("La demande n’a pas pu être traitée. Réessayez dans quelques instants.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {sent ? (
        <div className="form-success" role="status">
          Si un compte autorisé correspond à cette adresse, un e-mail de récupération vient d’être envoyé. Consultez aussi vos courriers indésirables.
        </div>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          <div className="field field-full">
            <label htmlFor="recovery-email">Adresse e-mail du compte</label>
            <input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {error && <p className="form-error field-full" role="alert">{error}</p>}
          <div className="field-full"><button className="button" type="submit" disabled={busy}>{busy ? "Envoi…" : "Envoyer le lien de récupération"}</button></div>
        </form>
      )}
      <p className="form-note">Vous devez déjà disposer d’un compte administrateur autorisé.</p>
      <Link className="text-link" href={`${adminBasePath}/connexion`}>Retour à la connexion</Link>
    </>
  );
}
