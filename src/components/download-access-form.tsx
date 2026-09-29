"use client";

import { useState, type FormEvent } from "react";

export function DownloadAccessForm({ initialToken }: { initialToken?: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setDownloaded(false);
    if (!configured) { setError("L’accès sécurisé sera disponible après configuration du service."); return; }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return;
    setBusy(true);
    try {
      const response = await fetch(`${url}/functions/v1/download-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        cache: "no-store",
        body: JSON.stringify({ token: initialToken || null, code: initialToken ? null : code.trim() || null }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || "Code ou lien invalide, expiré ou révoqué.");
      }
      if (!response.headers.get("content-type")?.toLowerCase().includes("application/pdf")) {
        throw new Error("Le fichier demandé n’est pas disponible au téléchargement.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "maison-karidja-livre.pdf";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setDownloaded(true);
      setCode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’accès n’a pas pu être vérifié.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      {!configured && <p className="notice field-full">L’accès sécurisé n’est pas encore configuré.</p>}
      {!initialToken && <div className="field field-full">
        <label htmlFor="download-code">Code d’accès</label>
        <input id="download-code" autoComplete="one-time-code" maxLength={80} value={code} onChange={(event) => setCode(event.target.value)} required />
      </div>}
      {error && <p className="form-error field-full" role="alert">{error}</p>}
      {downloaded && <p className="form-success field-full" role="status">Le téléchargement a été préparé. Cet accès autorise au maximum deux téléchargements au total.</p>}
      <div className="field-full">
        <button className="button" type="submit" disabled={!configured || busy || (!initialToken && !code.trim())}>{busy ? "Vérification…" : "Vérifier et télécharger"}</button>
        <p className="form-note">Un accès valide autorise au maximum deux téléchargements. Le lien et le code sont individuels; ne les partagez pas.</p>
      </div>
    </form>
  );
}
