"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export function AdminLoginForm() {
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
      setError("Connexion impossible. Vérifiez vos identifiants ou demandez un accès à l’administratrice.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      {!configured && <p className="notice field-full">L’accès administrateur sera activé après la configuration Supabase et l’ajout d’un compte réel.</p>}
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
  );
}
