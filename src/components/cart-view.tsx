"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useCart } from "@/src/components/cart-provider";
import { EmptyState } from "@/src/components/empty-state";
import { PhoneFields } from "@/src/components/phone-fields";
import { formatPrice } from "@/src/lib/money";
import { normalizeEcowasPhone } from "@/src/lib/phone";
import type { PublicProduct, PublicSiteSettings } from "@/src/lib/types";

interface CreatedOrder {
  order_number: string;
  payment_status: "PENDING";
  admin_whatsapp_e164: string;
  total_amount: number;
  currency: string;
  items: Array<{ name: string; quantity: number }>;
}

export function CartView({ products, settings, backendReady }: { products: PublicProduct[]; settings: PublicSiteSettings | null; backendReady: boolean }) {
  const { items, setQuantity, removeItem, clearCart } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  const lines = useMemo(() => items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? [{ product, quantity: item.quantity }] : [];
  }), [items, products]);
  const currencies = [...new Set(lines.map((line) => line.product.currency))];
  const currencyMismatch = currencies.length > 1;
  const hasUnavailableProduct = lines.some(({ product }) => product.availability !== "AVAILABLE");
  const total = lines.reduce((sum, line) => sum + line.product.price_amount * line.quantity, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setConfirmation("");
    setWhatsappUrl("");
    const validatedPhone = normalizeEcowasPhone(phone, country);
    if (!validatedPhone.ok) { setError(validatedPhone.error); return; }
    if (!lines.length) { setError("Votre panier ne contient aucun article publié disponible."); return; }
    if (hasUnavailableProduct) { setError("Retirez les articles indisponibles avant de préparer votre commande."); return; }
    if (currencyMismatch) { setError("Regroupez les articles dans une seule devise avant de commander."); return; }
    if (!backendReady || !settings?.admin_whatsapp_e164) { setError("La commande WhatsApp sera activée après configuration par Maison Karidja."); return; }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) { setError("Le service de commande n’est pas disponible."); return; }

    setBusy(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/create-jewelry-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          phone_e164: validatedPhone.e164,
          country_iso: country,
          email: email.trim() || null,
          items: lines.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
        }),
      });
      const payload = await response.json() as Partial<CreatedOrder> & { error?: string };
      if (!response.ok || !payload.order_number || !payload.admin_whatsapp_e164 || payload.payment_status !== "PENDING" || !payload.items) {
        throw new Error(payload.error || "La commande n’a pas pu être enregistrée.");
      }
      const summary = payload.items.map((item) => `${item.name} × ${item.quantity}`).join("; ");
      const message = [
        "Bonjour Maison Karidja, je souhaite commander les articles ci-dessous.",
        `Commande : ${payload.order_number}`,
        `Articles : ${summary}`,
        `Total calculé : ${formatPrice(payload.total_amount ?? total, payload.currency ?? currencies[0] ?? "")}`,
        `Nom : ${customerName.trim()}`,
        `WhatsApp : ${validatedPhone.e164}`,
      ].join("\n");
      const digits = payload.admin_whatsapp_e164.replace(/\D/g, "");
      setWhatsappUrl(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
      setConfirmation(`Commande ${payload.order_number} enregistrée. Le paiement reste à convenir et à vérifier manuellement.`);
      clearCart();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue. Réessayez plus tard.");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0 && !confirmation) {
    return <EmptyState title="Votre panier est vide">
      <p>Les articles apparaîtront ici uniquement après leur publication par Karidja.</p>
      <div className="button-row" style={{ justifyContent: "center" }}><Link className="button" href="/boutique">Voir la boutique</Link></div>
    </EmptyState>;
  }

  return (
    <div className="cart-layout">
      {confirmation ? (
        <section className="cart-confirmation" aria-live="polite">
          <div className="form-success"><strong>Demande créée</strong><p>{confirmation}</p></div>
          {whatsappUrl && <a className="button button-whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp avec le message préparé</a>}
          <p className="form-note">WhatsApp s’ouvre avec le texte prérempli; vérifiez-le puis appuyez vous-même sur Envoyer. Le système ne transmet aucun message automatiquement.</p>
        </section>
      ) : (
        <>
          <div className="cart-lines">
            {lines.length === 0 ? <p className="notice">Les articles précédemment ajoutés ne sont plus publiés ou ne sont pas disponibles.</p> : lines.map(({ product, quantity }) => (
              <article className="cart-line" key={product.id}>
                <div>
                  <Link href={`/boutique/${encodeURIComponent(product.slug)}`}><strong>{product.name}</strong></Link>
                  <p className="muted">Référence : {product.reference} · {product.availability === "AVAILABLE" ? "Disponible" : "Indisponible"}</p>
                  <p className="muted">{formatPrice(product.price_amount, product.currency)} l’unité</p>
                </div>
                <div className="cart-line-controls">
                  <label className="sr-only" htmlFor={`quantity-${product.id}`}>Quantité pour {product.name}</label>
                  <input id={`quantity-${product.id}`} type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(product.id, Number(event.target.value))} />
                  <button className="text-button" type="button" onClick={() => removeItem(product.id)}>Retirer</button>
                </div>
              </article>
            ))}
            {currencyMismatch && <p className="form-error" role="alert">Une seule devise peut être utilisée par commande.</p>}
            {lines.length > 0 && !currencyMismatch && <p className="cart-total">Total indicatif : <strong>{formatPrice(total, currencies[0])}</strong></p>}
            <p className="form-note">Le total définitif est recalculé côté serveur à partir des prix publiés.</p>
          </div>
          <form className="cart-checkout form-grid" onSubmit={submit}>
            <h2 className="display field-full">Vos coordonnées</h2>
            {!backendReady && <p className="notice field-full">La commande WhatsApp sera activée après configuration du service. Aucun message n’est envoyé automatiquement.</p>}
            <div className="field field-full">
              <label htmlFor="jewelry-name">Nom complet <span aria-hidden="true">*</span></label>
              <input id="jewelry-name" name="customer_name" autoComplete="name" maxLength={120} required value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </div>
            <PhoneFields country={country} phone={phone} onCountryChange={setCountry} onPhoneChange={setPhone} />
            <div className="field field-full">
              <label htmlFor="jewelry-email">Adresse e-mail (facultatif)</label>
              <input id="jewelry-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            {error && <p className="form-error field-full" role="alert">{error}</p>}
            <div className="field-full">
              <button className="button button-whatsapp" type="submit" disabled={busy || !backendReady || !lines.length || currencyMismatch || hasUnavailableProduct}>
                {busy ? "Préparation…" : "Préparer ma commande WhatsApp"}
              </button>
              <p className="form-note">Le message est préparé après l’enregistrement. Vous le vérifiez puis appuyez vous-même sur Envoyer. Aucun paiement en ligne n’est effectué ici.</p>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
