"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export type AdminSettings = {
  admin_whatsapp_e164: string | null;
  payment_instructions: string | null;
  support_email: string | null;
  legal_entity_name: string | null;
  business_address: string | null;
} | null;

type SettingsDraft = { admin_whatsapp_e164: string; payment_instructions: string; support_email: string; legal_entity_name: string; business_address: string };

export function AdminSettingsForm({ settings }: { settings: AdminSettings }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SettingsDraft>({
    admin_whatsapp_e164: settings?.admin_whatsapp_e164 ?? "", payment_instructions: settings?.payment_instructions ?? "",
    support_email: settings?.support_email ?? "", legal_entity_name: settings?.legal_entity_name ?? "", business_address: settings?.business_address ?? "",
  });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const phone = draft.admin_whatsapp_e164.trim();
    if (phone && !/^\+[1-9][0-9]{6,14}$/.test(phone)) { setError("Saisissez le numéro WhatsApp de Karidja au format international E.164."); return; }
    const email = draft.support_email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Vérifiez l’adresse e-mail de support."); return; }
    const client = getSupabaseBrowserClient(); if (!client) { setError("Supabase n’est pas configuré."); return; }
    setBusy(true); const { data: { user } } = await client.auth.getUser();
    const { error: saveError } = await client.from("site_settings").upsert({
      singleton: true,
      admin_whatsapp_e164: phone || null,
      payment_instructions: draft.payment_instructions.trim() || null,
      support_email: email || null,
      legal_entity_name: draft.legal_entity_name.trim() || null,
      business_address: draft.business_address.trim() || null,
      updated_by: user?.id ?? null,
    }, { onConflict: "singleton" });
    setBusy(false);
    if (saveError) { setError("Les réglages n’ont pas été enregistrés. Vérifiez que votre compte possède le rôle administrateur."); return; }
    setNotice("Réglages enregistrés."); router.refresh();
  }

  return (
    <section className="admin-panel">
      <h2 className="display">Réglages Maison Karidja</h2>
      <p className="muted">Ces valeurs doivent être les coordonnées et consignes réellement utilisées par Karidja. Les champs laissés vides ne sont pas remplacés par des données d’exemple.</p>
      <form className="form-grid" onSubmit={save}>
        <div className="field field-full"><label htmlFor="settings-whatsapp">WhatsApp de Karidja (E.164, requis pour les commandes bijoux)</label><input id="settings-whatsapp" type="tel" inputMode="tel" maxLength={16} value={draft.admin_whatsapp_e164} onChange={(e) => setDraft({ ...draft, admin_whatsapp_e164: e.target.value })} /></div>
        <div className="field field-full"><label htmlFor="settings-payment">Consignes de paiement réelles (facultatif)</label><textarea id="settings-payment" maxLength={3000} value={draft.payment_instructions} onChange={(e) => setDraft({ ...draft, payment_instructions: e.target.value })} /></div>
        <div className="field"><label htmlFor="settings-email">E-mail de support</label><input id="settings-email" type="email" maxLength={254} value={draft.support_email} onChange={(e) => setDraft({ ...draft, support_email: e.target.value })} /></div>
        <div className="field"><label htmlFor="settings-entity">Identité juridique de l’éditeur</label><input id="settings-entity" maxLength={200} value={draft.legal_entity_name} onChange={(e) => setDraft({ ...draft, legal_entity_name: e.target.value })} /></div>
        <div className="field field-full"><label htmlFor="settings-address">Adresse professionnelle</label><textarea id="settings-address" maxLength={1000} value={draft.business_address} onChange={(e) => setDraft({ ...draft, business_address: e.target.value })} /></div>
        {error && <p className="form-error field-full" role="alert">{error}</p>}{notice && <p className="form-success field-full" role="status">{notice}</p>}
        <div className="field-full"><button className="button" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer les réglages"}</button></div>
      </form>
    </section>
  );
}
