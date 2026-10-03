"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import { isValidAdminCode } from "@/src/lib/admin-access-code";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const GENERIC_MESSAGE = "Si le code est actif et correspond à cette adresse, un e-mail d’invitation a été envoyé. Consultez aussi vos courriers indésirables.";

export function AdminSignupForm({ adminBasePath }: { adminBasePath: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);
    const normalizedCode = code.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidAdminCode(normalizedCode)) {
      setError("Le code doit contenir 32 caractères valides.");
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Le service d’authentification n’est pas disponible.");
      return;
    }

    setBusy(true);
    try {
      const { error: requestError } = await client.functions.invoke("request-admin-access", {
        body: { email: normalizedEmail, code: normalizedCode },
      });
      if (requestError) throw new Error("INVITATION_REQUEST_FAILED");
      setCode("");
      setSent(true);
    } catch {
      setError("La demande n’a pas pu être traitée. Réessayez plus tard ou contactez l’administratrice.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {sent ? (
        <div className="form-success" role="status">{GENERIC_MESSAGE}</div>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          {!configured && <p className="notice field-full">L’authentification Supabase n’est pas encore configurée.</p>}
          <div className="field field-full">
            <label htmlFor="admin-access-email">Adresse e-mail à autoriser</label>
            <input id="admin-access-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field field-full">
            <label htmlFor="admin-access-code">Code d’accès à usage unique</label>
            <input id="admin-access-code" name="code" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} required minLength={32} maxLength={32} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
            <small>Le code est vérifié côté serveur et n’est jamais conservé en clair.</small>
          </div>
          {error && <p className="form-error field-full" role="alert">{error}</p>}
          <div className="field-full"><button className="button" type="submit" disabled={!configured || busy}>{busy ? "Vérification…" : "Recevoir le lien d’activation"}</button></div>
        </form>
      )}
      <p className="form-note">Si l’accès est valide, un e-mail de confirmation sera envoyé à l’adresse indiquée. Le mot de passe sera défini après ouverture du lien.</p>
      <Link className="text-link" href={`${adminBasePath}/connexion`}>Retour à la connexion</Link>
    </>
  );
}
