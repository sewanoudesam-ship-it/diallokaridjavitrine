"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import { generateAdminCode, hashAdminCode } from "@/src/lib/admin-access-code";

export function AdminAccountsManager() {
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setInviteCode("");
    setExpiresAt("");
    setCopied(false);
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Le service d’authentification n’est pas disponible.");
      return;
    }

    setBusy(true);
    try {
      const code = generateAdminCode();
      const codeHash = await hashAdminCode(code);
      const { data, error: inviteError } = await client.rpc("create_admin_invitation", {
        p_email: email.trim().toLowerCase(),
        p_code_hash: codeHash,
      });
      if (inviteError || !data) throw new Error("INVITATION_CREATE_FAILED");
      setInviteCode(code);
      setExpiresAt(data);
      setMessage("Invitation créée. Copiez le code maintenant : il ne sera plus affiché après avoir quitté cette page ou créé une nouvelle invitation.");
    } catch {
      setError("L’invitation n’a pas pu être créée. Vérifiez l’adresse et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!inviteCode || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
    } catch {
      setError("La copie automatique a échoué. Sélectionnez le code et copiez-le manuellement.");
    }
  }

  return (
    <div className="admin-manager">
      <section className="admin-panel">
        <h2>Inviter une administratrice</h2>
        <p className="muted">L’invitation est liée à l’adresse indiquée, utilisable une seule fois et valable sept jours. Le code brut n’est jamais enregistré dans la base de données.</p>
        <form className="form-grid" onSubmit={submit}>
          <div className="field field-full">
            <label htmlFor="admin-invite-email">Adresse e-mail de l’invitée</label>
            <input id="admin-invite-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {error && <p className="form-error field-full" role="alert">{error}</p>}
          <div className="field-full"><button className="button" type="submit" disabled={busy}>{busy ? "Création…" : "Créer une invitation"}</button></div>
        </form>
      </section>

      {inviteCode && (
        <section className="admin-panel" aria-live="polite">
          <h2>Code à transmettre une seule fois</h2>
          <p className="notice">Destinataire : <strong>{email.trim().toLowerCase()}</strong><br />Expiration : <strong>{new Date(expiresAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</strong></p>
          <p className="access-code" aria-label="Code d’invitation">{inviteCode}</p>
          <div className="workflow-actions">
            <button className="button button-secondary" type="button" onClick={copyCode}>{copied ? "Code copié" : "Copier le code"}</button>
            <span className="form-note">À transmettre en privé à l’adresse invitée; la personne devra confirmer son e-mail.</span>
          </div>
          {message && <p className="form-success" role="status">{message}</p>}
        </section>
      )}
      {!inviteCode && message && <p className="form-success" role="status">{message}</p>}
    </div>
  );
}
