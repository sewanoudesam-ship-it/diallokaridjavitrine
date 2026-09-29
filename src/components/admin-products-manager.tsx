"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import type { ProductAvailability } from "@/src/lib/supabase/database.types";

export type AdminProductRow = {
  id: string; name: string; slug: string; reference: string; description: string | null; category: string | null;
  price_amount: number; currency: string; availability: ProductAvailability; status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  image_url: string | null; image_alt: string | null; created_at: string; published_at: string | null;
};

type ProductDraft = {
  name: string; slug: string; reference: string; description: string; category: string;
  price: string; currency: string; availability: ProductAvailability;
};
const EMPTY_DRAFT: ProductDraft = { name: "", slug: "", reference: "", description: "", category: "", price: "", currency: "", availability: "UNAVAILABLE" };
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AdminProductsManager({ products }: { products: AdminProductRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [altText, setAltText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [busyProduct, setBusyProduct] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function clearEditor() {
    setDraft(EMPTY_DRAFT);
    setEditingProductId(null);
  }

  function beginEdit(product: AdminProductRow) {
    setError(""); setNotice(""); setEditingProductId(product.id);
    setDraft({
      name: product.name, slug: product.slug, reference: product.reference,
      description: product.description ?? "", category: product.category ?? "",
      price: String(product.price_amount), currency: product.currency,
      availability: product.availability,
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const client = getSupabaseBrowserClient();
    if (!client) { setError("Supabase n’est pas configuré."); return; }
    const amount = Number(draft.price); const currency = draft.currency.trim().toUpperCase();
    const reference = draft.reference.trim();
    if (!Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) { setError("Saisissez le prix réel et son code de devise ISO à trois lettres."); return; }
    if (!reference || reference.length > 120) { setError("Saisissez la référence réelle de l’article (120 caractères maximum)."); return; }
    setBusy(true);
    const { data: { user } } = await client.auth.getUser();
    const values = {
      name: draft.name.trim(), slug: draft.slug.trim().toLowerCase(), reference,
      description: draft.description.trim() || null, category: draft.category.trim() || null,
      price_amount: amount, currency, availability: draft.availability,
    };
    const result = editingProductId
      ? await client.from("products").update(values).eq("id", editingProductId)
      : await client.from("products").insert({ ...values, status: "DRAFT", created_by: user?.id ?? null });
    setBusy(false);
    if (result.error) { setError("La fiche n’a pas été enregistrée. Vérifiez la référence unique, le slug, le prix et les champs obligatoires."); return; }
    clearEditor(); setNotice(editingProductId ? "Modifications enregistrées." : "Fiche enregistrée en brouillon. Ajoutez une photo réelle fournie par Karidja avant publication."); router.refresh();
  }

  async function uploadImage(product: AdminProductRow, file: File | undefined) {
    setError(""); setNotice(""); if (!file) return;
    const client = getSupabaseBrowserClient(); if (!client) { setError("Supabase n’est pas configuré."); return; }
    if (!IMAGE_TYPES.includes(file.type) || file.size > 10 * 1024 * 1024) { setError("La photo doit être un JPG, PNG ou WebP de 10 Mo maximum."); return; }
    const alt = altText[product.id]?.trim(); if (!alt || alt.length > 240) { setError("Saisissez un texte alternatif réel pour cette photo avant de la téléverser."); return; }
    setBusyProduct(product.id);
    const { data: { user } } = await client.auth.getUser();
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const storagePath = `${product.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage.from("public-assets").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) { setBusyProduct(""); setError("La photo n’a pas pu être téléversée."); return; }
    const { data: previous } = await client.from("product_images").select("id").eq("product_id", product.id).eq("is_primary", true).maybeSingle();
    if (previous?.id) {
      const { error: clearError } = await client.from("product_images").update({ is_primary: false }).eq("id", previous.id);
      if (clearError) { await client.storage.from("public-assets").remove([storagePath]); setBusyProduct(""); setError("La photo précédente n’a pas pu être remplacée."); return; }
    }
    const { error: insertError } = await client.from("product_images").insert({ product_id: product.id, storage_path: storagePath, alt_text: alt, is_primary: true, position: 0, uploaded_by: user?.id ?? null });
    setBusyProduct("");
    if (insertError) {
      await client.storage.from("public-assets").remove([storagePath]);
      if (previous?.id) await client.from("product_images").update({ is_primary: true }).eq("id", previous.id);
      setError("La photo n’a pas été rattachée au produit; l’image précédente a été conservée."); return;
    }
    setNotice("Photo téléversée et rattachée au produit. Aucune image externe n’est utilisée."); router.refresh();
  }

  async function setStatus(product: AdminProductRow, status: AdminProductRow["status"]) {
    setError(""); setNotice(""); const client = getSupabaseBrowserClient();
    if (!client) { setError("Supabase n’est pas configuré."); return; }
    if (status === "PUBLISHED" && !product.image_url) { setError("Ajoutez d’abord une photo réellement fournie par Karidja avant la publication."); return; }
    setBusyProduct(product.id);
    const { error: updateError } = await client.from("products").update({ status, published_at: status === "PUBLISHED" ? product.published_at ?? new Date().toISOString() : null }).eq("id", product.id);
    setBusyProduct("");
    if (updateError) { setError("Le statut du produit n’a pas pu être modifié. Vérifiez ses informations réelles."); return; }
    setNotice("Statut du produit mis à jour."); router.refresh();
  }

  return (
    <div className="admin-manager">
      <section className="admin-panel">
        <h2 id="product-editor-title" className="display">{editingProductId ? "Modifier la fiche bijou" : "Ajouter un bijou"}</h2>
        <p className="muted">Aucun article n’est prérempli. Les fiches commencent en brouillon; une référence et la disponibilité sont enregistrées à partir des informations saisies par Karidja. Seules ses photos peuvent apparaître sur le site.</p>
        <form className="form-grid" onSubmit={saveProduct}>
          <div className="field"><label htmlFor="product-name">Nom</label><input id="product-name" required maxLength={200} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="field"><label htmlFor="product-reference">Référence</label><input id="product-reference" required maxLength={120} value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} /></div>
          <div className="field"><label htmlFor="product-slug">Slug URL</label><input id="product-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={200} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} /></div>
          <div className="field"><label htmlFor="product-price">Prix réel</label><input id="product-price" required type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
          <div className="field"><label htmlFor="product-currency">Devise (ISO 4217)</label><input id="product-currency" required maxLength={3} pattern="[A-Za-z]{3}" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></div>
          <div className="field"><label htmlFor="product-availability">Disponibilité</label><select id="product-availability" required value={draft.availability} onChange={(e) => setDraft({ ...draft, availability: e.target.value as ProductAvailability })}><option value="AVAILABLE">Disponible</option><option value="UNAVAILABLE">Indisponible</option></select></div>
          <div className="field"><label htmlFor="product-category">Catégorie (facultatif)</label><input id="product-category" maxLength={120} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></div>
          <div className="field field-full"><label htmlFor="product-description">Description (facultatif)</label><textarea id="product-description" maxLength={5000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          <div className="field-full button-row"><button className="button" disabled={busy}>{busy ? "Enregistrement…" : editingProductId ? "Enregistrer les modifications" : "Enregistrer le brouillon"}</button>{editingProductId && <button className="button button-secondary" type="button" onClick={clearEditor}>Annuler la modification</button>}</div>
        </form>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
      <section className="admin-list" aria-labelledby="product-list-title"><h2 id="product-list-title" className="display">Fiches enregistrées</h2>
        {products.length === 0 ? <p className="notice">Aucun produit réel n’a encore été ajouté.</p> : products.map((product) => (
          <article className="admin-item" key={product.id}>
            <div className="admin-item-main">
              {product.image_url && <Image className="admin-thumb" src={product.image_url} width={96} height={96} unoptimized alt={product.image_alt ?? `Photo publiée de ${product.name}`} />}
              <div><span className="eyebrow">{product.status}</span><h3>{product.name}</h3><p>Référence : {product.reference}</p><p>{product.price_amount} {product.currency} · {product.availability === "AVAILABLE" ? "Disponible" : "Indisponible"}</p><p className="muted">{product.image_url ? "Photo réelle uploadée" : "Aucune photo publiée"}</p></div>
            </div>
            <div className="admin-actions">
              <button className="button button-secondary" type="button" onClick={() => beginEdit(product)}>Modifier la fiche</button>
              <div className="field"><label htmlFor={`product-alt-${product.id}`}>Texte alternatif de la photo</label><input id={`product-alt-${product.id}`} maxLength={240} value={altText[product.id] ?? ""} onChange={(e) => setAltText({ ...altText, [product.id]: e.target.value })} /></div>
              <label className="button button-secondary file-button">{busyProduct === product.id ? "Téléversement…" : "Téléverser photo réelle"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busyProduct === product.id} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void uploadImage(product, file); }} /></label>
              <select aria-label={`Statut de ${product.name}`} value={product.status} disabled={busyProduct === product.id} onChange={(e) => void setStatus(product, e.target.value as AdminProductRow["status"])}>
                <option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="HIDDEN">Masqué</option><option value="ARCHIVED">Archivé</option>
              </select>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
