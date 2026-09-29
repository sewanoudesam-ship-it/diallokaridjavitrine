"use client";

import { useState, type FormEvent } from "react";
import { PhoneFields } from "@/src/components/phone-fields";
import { normalizeEcowasPhone } from "@/src/lib/phone";

interface BookOrderFormProps { bookId: string }
interface OrderCreated {
  order_number: string;
  payment_status: "PENDING";
  payment_instructions: string | null;
  admin_whatsapp_e164: string | null;
}

export function BookOrderForm({ bookId }: BookOrderFormProps) {
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderCreated | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validPhone = normalizeEcowasPhone(phone, country);
    if (!validPhone.ok) { setError(validPhone.error); return; }
    if (!configured) { setError("Les commandes ne sont pas encore configurées par Maison Karidja."); return; }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) { setError("Le service de commande n’est pas disponible."); return; }

    setBusy(true);
    try {
      const response = await fetch(`${url}/functions/v1/create-book-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        cache: "no-store",
        body: JSON.stringify({ book_id: bookId, customer_name: name.trim(), phone_e164: validPhone.e164, country_iso: country, email: email.trim() || null }),
      });
      const payload = await response.json() as Partial<OrderCreated> & { error?: string };
      if (!response.ok || !payload.order_number || payload.payment_status !== "PENDING") {
        throw new Error(payload.error || "La commande n’a pas pu être enregistrée.");
      }
      setResult({
        order_number: payload.order_number,
        payment_status: "PENDING",
        payment_instructions: typeof payload.payment_instructions === "string" ? payload.payment_instructions : null,
        admin_whatsapp_e164: typeof payload.admin_whatsapp_e164 === "string" ? payload.admin_whatsapp_e164 : null,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue. Réessayez plus tard.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const recipient = result.admin_whatsapp_e164?.replace(/\D/g, "");
    const message = `Bonjour Maison Karidja, ma commande ${result.order_number} est enregistrée. Merci de m’indiquer les modalités de paiement.`;
    const whatsappUrl = recipient ? `https://wa.me/${recipient}?text=${encodeURIComponent(message)}` : null;
    return (
      <div className="form-success" role="status">
        <strong>Demande enregistrée — {result.order_number}</strong>
        {result.payment_instructions ? (
          <div className="payment-instructions"><p><strong>Modalités de paiement communiquées par Maison Karidja</strong></p><p className="preserve-lines">{result.payment_instructions}</p></div>
        ) : (
          <p>Le paiement reste en attente de vérification par Maison Karidja. Les modalités de paiement n’ont pas encore été renseignées.</p>
        )}
        {whatsappUrl && <p><a className="text-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp pour demander les modalités</a></p>}
        <p>Votre code et votre lien seront préparés uniquement après validation effective du paiement.</p>
      </div>
    );
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      {!configured && <p className="notice field-full">Le formulaire sera actif lorsque le service de commande de Maison Karidja sera configuré. Aucune commande fictive n’est créée.</p>}
      <div className="field field-full">
        <label htmlFor="customer-name">Nom complet <span aria-hidden="true">*</span></label>
        <input id="customer-name" name="customer_name" autoComplete="name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <PhoneFields country={country} phone={phone} onCountryChange={setCountry} onPhoneChange={setPhone} />
      <div className="field field-full">
        <label htmlFor="customer-email">Adresse e-mail (facultatif)</label>
        <input id="customer-email" type="email" name="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      {error && <p className="form-error field-full" role="alert">{error}</p>}
      <div className="field-full">
        <button className="button" type="submit" disabled={!configured || busy}>{busy ? "Enregistrement…" : "Valider ma demande"}</button>
        <p className="form-note">La commande n’est pas un paiement en ligne; le paiement sera vérifié manuellement.</p>
      </div>
    </form>
  );
}
