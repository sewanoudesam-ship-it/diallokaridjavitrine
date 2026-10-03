"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export function AdminLoginForm({ adminBasePath }: { adminBasePath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const client = getSupabaseBrowserClient();
    if (!client) { setError("L’authentification n’est pas encore configurée."); return; }
    setBusy(true);
    const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) {
      setError("Connexion impossible. Vérifiez vos identifiants ou votre autorisation administrateur.");
      return;
    }
    router.replace(adminBasePath);
    router.refresh();
  }

  return (
    <>
      <form className="form-grid" onSubmit={submit}>
        {!configured && <p className="notice field-full">L’accès administrateur sera activé après la configuration Supabase et la création d’un compte réel autorisé.</p>}
        <div className="field field-full">
          <label htmlFor="admin-email">Adresse e-mail</label>
          <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="field field-full">
          <label htmlFor="admin-password">Mot de passe</label>
          <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error && <p className="form-error field-full" role="alert">{error}</p>}
        <div className="field-full"><button className="button" type="submit" disabled={!configured || busy}>{busy ? "Connexion…" : "Se connecter"}</button></div>
      </form>
      <div className="workflow-actions">
        <Link className="text-link" href={`${adminBasePath}/mot-de-passe-oublie`}>Mot de passe oublié ?</Link>
        <Link className="text-link" href={`${adminBasePath}/inscription`}>J’ai un code d’accès</Link>
      </div>
    </>
  );
}
