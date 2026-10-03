"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export function AdminLogoutButton({ adminBasePath }: { adminBasePath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    const client = getSupabaseBrowserClient();
    if (!client) { setError("La session ne peut pas être fermée tant que Supabase n’est pas configuré."); setBusy(false); return; }
    const { error: signOutError } = await client.auth.signOut();
    setBusy(false);
    if (signOutError) { setError("La déconnexion n’a pas abouti. Réessayez."); return; }
    router.replace(`${adminBasePath}/connexion`);
    router.refresh();
  }
  return <div className="logout-control"><button className="button button-secondary" type="button" onClick={logout} disabled={busy}>{busy ? "Déconnexion…" : "Se déconnecter"}</button>{error && <span className="form-error" role="alert">{error}</span>}</div>;
}
