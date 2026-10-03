"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function AdminPasswordUpdateForm({ adminBasePath }: { adminBasePath: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(!configured);
  const [error, setError] = useState(configured ? "" : "Le service d’authentification n’est pas disponible.");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const client = getSupabaseBrowserClient();
    if (!client) return () => { active = false; };
    void client.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) setError("Le lien de récupération a expiré ou a déjà été utilisé. Demandez-en un nouveau.");
      setReady(true);
    }).catch(() => {
      if (active) {
        setError("La session de récupération est invalide. Demandez un nouveau lien.");
        setReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError("Choisissez un mot de passe d’au moins 12 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Le service d’authentification n’est pas disponible.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await client.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Le mot de passe n’a pas pu être mis à jour. Le lien a peut-être expiré; demandez-en un nouveau.");
      return;
    }
    setDone(true);
    setPassword("");
    setConfirmation("");
  }

  if (done) {
    return <div className="form-success" role="status">Votre mot de passe a été modifié. <button className="text-button" type="button" onClick={() => { router.replace(adminBasePath); router.refresh(); }}>Continuer vers l’administration</button></div>;
  }

  return (
    <>
      {error && <p className="notice" role="status">{error}</p>}
      <form className="form-grid" onSubmit={submit}>
        <div className="field field-full">
          <label htmlFor="new-admin-password">Nouveau mot de passe</label>
          <input id="new-admin-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <small>12 caractères minimum.</small>
        </div>
        <div className="field field-full">
          <label htmlFor="confirm-admin-password">Confirmer le mot de passe</label>
          <input id="confirm-admin-password" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </div>
        {error && <p className="form-error field-full" role="alert">{error}</p>}
        <div className="field-full"><button className="button" type="submit" disabled={!ready || Boolean(error) || busy}>{busy ? "Mise à jour…" : "Enregistrer le nouveau mot de passe"}</button></div>
      </form>
      <p><Link className="text-link" href={`${adminBasePath}/mot-de-passe-oublie`}>Demander un autre lien</Link></p>
    </>
  );
}
