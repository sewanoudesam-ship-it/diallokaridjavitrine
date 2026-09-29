"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

type BookStatus = "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";

export type AdminBookRow = {
  id: string;
  title: string;
  author: string;
  slug: string;
  description: string | null;
  excerpt: string | null;
  price_amount: number | null;
  currency: string | null;
  status: BookStatus;
  cover_url: string | null;
  has_original_pdf: boolean;
  created_at: string;
  published_at: string | null;
};

type BookDraft = {
  title: string;
  author: string;
  slug: string;
  price: string;
  currency: string;
  description: string;
  excerpt: string;
};

type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;

const EMPTY_DRAFT: BookDraft = {
  title: "",
  author: "",
  slug: "",
  price: "",
  currency: "",
  description: "",
  excerpt: "",
};

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const STEPS: Array<{ number: WorkflowStep; label: string }> = [
  { number: 1, label: "Informations du livre" },
  { number: 2, label: "Couverture" },
  { number: 3, label: "PDF original" },
  { number: 4, label: "Prix" },
  { number: 5, label: "Prévisualisation" },
  { number: 6, label: "Publication" },
];

function makeNewWorkflowBook(id: string, draft: BookDraft): AdminBookRow {
  return {
    id,
    title: draft.title.trim(),
    author: draft.author.trim(),
    slug: draft.slug.trim().toLowerCase(),
    description: draft.description.trim() || null,
    excerpt: draft.excerpt.trim() || null,
    // A new draft intentionally has no price or currency until step 4.
    price_amount: null,
    currency: null,
    status: "DRAFT",
    cover_url: null,
    has_original_pdf: false,
    created_at: new Date().toISOString(),
    published_at: null,
  };
}

export function AdminBooksManager({ books }: { books: AdminBookRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BookDraft>(EMPTY_DRAFT);
  const [workflowBook, setWorkflowBook] = useState<AdminBookRow | null>(null);
  const [activeStep, setActiveStep] = useState<WorkflowStep>(1);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyBook, setBusyBook] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    return () => {
      if (coverPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  function beginEdit(book: AdminBookRow) {
    setWorkflowBook(book);
    setDraft({
      title: book.title,
      author: book.author,
      slug: book.slug,
      price: book.price_amount === null ? "" : String(book.price_amount),
      currency: book.currency ?? "",
      description: book.description ?? "",
      excerpt: book.excerpt ?? "",
    });
    setCoverPreviewUrl(book.cover_url);
    setPdfUploaded(book.has_original_pdf);
    setActiveStep(1);
    setError("");
    setNotice("");
  }

  function cancelWorkflow() {
    setWorkflowBook(null);
    setDraft(EMPTY_DRAFT);
    setCoverPreviewUrl(null);
    setPdfUploaded(false);
    setActiveStep(1);
    setError("");
    setNotice("");
  }

  async function saveBookInformation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase n’est pas configuré.");
      return;
    }

    const title = draft.title.trim();
    const author = draft.author.trim();
    const slug = draft.slug.trim().toLowerCase();
    if (!title || !author || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError("Saisissez le titre, l’auteur/autrice et un slug URL valide.");
      return;
    }

    setBusy(true);
    const information = {
      title,
      author,
      slug,
      description: draft.description.trim() || null,
      excerpt: draft.excerpt.trim() || null,
    };

    if (workflowBook) {
      const { error: updateError } = await client.from("books").update(information).eq("id", workflowBook.id);
      setBusy(false);
      if (updateError) {
        setError("Les informations du livre n’ont pas pu être enregistrées. Vérifiez le slug et les champs obligatoires.");
        return;
      }
      setWorkflowBook((current) => (current ? { ...current, ...information } : current));
      setActiveStep(2);
      setNotice("Informations enregistrées. Passez à la couverture si vous en avez une.");
      router.refresh();
      return;
    }

    const {
      data: { user },
    } = await client.auth.getUser();
    const { data: created, error: insertError } = await client
      .from("books")
      .insert({
        ...information,
        // Do not invent a price or currency: both remain null until step 4.
        price_amount: null,
        currency: null,
        status: "DRAFT",
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (insertError || !created?.id) {
      setError("Le livre n’a pas pu être créé. Vérifiez le slug et les champs obligatoires.");
      return;
    }

    const createdBook = makeNewWorkflowBook(created.id, draft);
    setWorkflowBook(createdBook);
    setActiveStep(2);
    setNotice("Fiche créée en brouillon. Continuez les étapes ou revenez plus tard pour la terminer.");
    router.refresh();
  }

  async function uploadBookFile(book: AdminBookRow, file: File | undefined, kind: "pdf" | "cover") {
    setError("");
    setNotice("");
    if (!file) return;

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase n’est pas configuré.");
      return;
    }

    if (kind === "pdf") {
      const signature = new TextDecoder("ascii").decode(await file.slice(0, 5).arrayBuffer());
      if (file.type !== "application/pdf" || file.size > MAX_PDF_BYTES || signature !== "%PDF-") {
        setError("Le fichier doit être un PDF valide de 50 Mo maximum.");
        return;
      }
    } else if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError("La couverture doit être un JPG, PNG ou WebP de 10 Mo maximum.");
      return;
    }

    setBusyBook(book.id);
    const extension = kind === "pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const objectPath = `${book.id}/${kind}-${crypto.randomUUID()}.${extension}`;
    const bucket = kind === "pdf" ? "book-originals" : "public-assets";
    const { error: uploadError } = await client.storage.from(bucket).upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setBusyBook("");
      setError(kind === "pdf" ? "Le PDF original n’a pas pu être stocké dans le bucket privé." : "La couverture n’a pas pu être stockée.");
      return;
    }

    const patch = kind === "pdf" ? { original_pdf_path: objectPath } : { cover_path: objectPath };
    const { error: updateError } = await client.from("books").update(patch).eq("id", book.id);
    setBusyBook("");
    if (updateError) {
      await client.storage.from(bucket).remove([objectPath]);
      setError("Le fichier est téléversé mais sa fiche n’a pas pu être mise à jour. Réessayez.");
      return;
    }

    if (kind === "pdf") {
      setPdfUploaded(true);
      setWorkflowBook((current) => (current ? { ...current, has_original_pdf: true } : current));
      setNotice("PDF original enregistré dans le bucket privé book-originals.");
    } else {
      // The preview is based on the file selected by Karidja, never on a placeholder.
      setCoverPreviewUrl(URL.createObjectURL(file));
      setWorkflowBook((current) => (current ? { ...current, cover_url: null } : current));
      setNotice("Couverture enregistrée depuis votre fichier dans le bucket public-assets.");
    }
    router.refresh();
  }

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!workflowBook) {
      setError("Enregistrez d’abord les informations du livre.");
      return;
    }

    const amount = Number(draft.price);
    const currency = draft.currency.trim().toUpperCase();
    if (draft.price.trim() === "" || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) {
      setError("Saisissez un prix réel et son code de devise ISO à trois lettres.");
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase n’est pas configuré.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await client.from("books").update({ price_amount: amount, currency }).eq("id", workflowBook.id);
    setBusy(false);
    if (updateError) {
      setError("Le prix n’a pas pu être enregistré. Vérifiez le montant et la devise.");
      return;
    }
    setWorkflowBook((current) => (current ? { ...current, price_amount: amount, currency } : current));
    setActiveStep(5);
    setNotice("Prix enregistré. Vérifiez les données avant de publier.");
    router.refresh();
  }

  async function setStatus(book: AdminBookRow, status: BookStatus) {
    setError("");
    setNotice("");
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase n’est pas configuré.");
      return;
    }

    if (status === "PUBLISHED") {
      const hasRealPrice = book.price_amount !== null && Number.isFinite(book.price_amount) && book.price_amount >= 0;
      const hasRealCurrency = typeof book.currency === "string" && /^[A-Z]{3}$/.test(book.currency);
      if (!hasRealPrice || !hasRealCurrency || !book.has_original_pdf) {
        setError("Publication refusée : enregistrez un prix et une devise réels à l’étape 4, puis ajoutez le PDF original à l’étape 3.");
        return;
      }
    }

    setBusyBook(book.id);
    const publishedAt = status === "PUBLISHED" ? book.published_at ?? new Date().toISOString() : null;
    const { error: updateError } = await client.from("books").update({ status, published_at: publishedAt }).eq("id", book.id);
    setBusyBook("");
    if (updateError) {
      setError(status === "PUBLISHED" ? "Publication refusée par le serveur. Vérifiez le prix, la devise et le PDF original." : "Le statut n’a pas pu être modifié.");
      return;
    }
    setWorkflowBook((current) => (current?.id === book.id ? { ...current, status, published_at: publishedAt } : current));
    setNotice(status === "PUBLISHED" ? "Livre publié. Aucun auto-enrôlement public n’a été effectué." : "Statut du livre mis à jour.");
    router.refresh();
  }

  function goToStep(step: WorkflowStep) {
    if (step > 1 && !workflowBook) {
      setError("Enregistrez d’abord les informations du livre à l’étape 1.");
      return;
    }
    setError("");
    setActiveStep(step);
  }

  const busyForWorkflowBook = workflowBook ? busyBook === workflowBook.id : false;
  const priceLabel = (book: AdminBookRow) =>
    book.price_amount === null || !book.currency ? "Prix non renseigné" : `${book.price_amount} ${book.currency}`;

  return (
    <div className="admin-manager">
      <section className="admin-panel" aria-labelledby="book-workflow-title">
        <h2 id="book-workflow-title" className="display">
          {workflowBook ? `Modifier la fiche : ${workflowBook.title}` : "Ajouter une fiche livre"}
        </h2>
        <p className="muted">
          Les informations restent en brouillon jusqu’à une publication explicite. Aucun prix, fichier ou contenu de démonstration n’est créé à votre place.
        </p>

        <nav aria-label="Étapes de la fiche livre" className="book-workflow-steps">
          <ol>
            {STEPS.map((step) => (
              <li key={step.number}>
                <button
                  type="button"
                  className={activeStep === step.number ? "button" : "button button-secondary"}
                  aria-current={activeStep === step.number ? "step" : undefined}
                  disabled={step.number > 1 && !workflowBook}
                  onClick={() => goToStep(step.number)}
                >
                  <span aria-hidden="true">{step.number}.</span> {step.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {activeStep === 1 && (
          <form className="form-grid" onSubmit={saveBookInformation}>
            <div className="field"><label htmlFor="book-title">Titre</label><input id="book-title" required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div className="field"><label htmlFor="book-author">Autrice/auteur</label><input id="book-author" required maxLength={160} value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></div>
            <div className="field"><label htmlFor="book-slug">Slug URL</label><input id="book-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={200} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} /></div>
            <div className="field field-full"><label htmlFor="book-description">Description (facultatif)</label><textarea id="book-description" maxLength={5000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div className="field field-full"><label htmlFor="book-excerpt">Extrait (facultatif)</label><textarea id="book-excerpt" maxLength={3000} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} /></div>
            <div className="field-full workflow-actions">
              <button className="button" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer et continuer"}</button>
              <button type="button" className="button button-secondary" onClick={cancelWorkflow} disabled={busy}>Annuler</button>
            </div>
          </form>
        )}

        {activeStep === 2 && workflowBook && (
          <section aria-labelledby="cover-step-title">
            <h3 id="cover-step-title">Couverture</h3>
            <p className="muted">Cette étape est facultative. Sélectionnez uniquement une image réelle fournie par Karidja.</p>
            {coverPreviewUrl ? <Image className="admin-thumb" src={coverPreviewUrl} width={160} height={216} unoptimized alt={`Couverture uploadée de ${workflowBook.title}`} /> : <p className="notice">Aucune couverture fournie. Le livre pourra être publié sans image.</p>}
            <div className="workflow-actions">
              <label className="button button-secondary file-button">{busyForWorkflowBook ? "Téléversement…" : "Choisir une couverture"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busyForWorkflowBook} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void uploadBookFile(workflowBook, file, "cover"); }} /></label>
              <button type="button" className="button" onClick={() => goToStep(3)} disabled={busyForWorkflowBook}>Continuer vers le PDF</button>
              <button type="button" className="button button-secondary" onClick={() => goToStep(1)} disabled={busyForWorkflowBook}>Retour</button>
            </div>
          </section>
        )}

        {activeStep === 3 && workflowBook && (
          <section aria-labelledby="pdf-step-title">
            <h3 id="pdf-step-title">PDF original</h3>
            <p className="muted">Le PDF est vérifié (type MIME, signature %PDF- et taille maximale de 50 Mo) puis conservé dans le bucket privé book-originals.</p>
            <p className="notice">{pdfUploaded ? "PDF original enregistré." : "Aucun PDF original enregistré."}</p>
            <div className="workflow-actions">
              <label className="button button-secondary file-button">{busyForWorkflowBook ? "Téléversement…" : "Choisir le PDF original"}<input type="file" accept="application/pdf,.pdf" disabled={busyForWorkflowBook} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void uploadBookFile(workflowBook, file, "pdf"); }} /></label>
              <button type="button" className="button" onClick={() => goToStep(4)} disabled={busyForWorkflowBook}>Continuer vers le prix</button>
              <button type="button" className="button button-secondary" onClick={() => goToStep(2)} disabled={busyForWorkflowBook}>Retour</button>
            </div>
          </section>
        )}

        {activeStep === 4 && workflowBook && (
          <form className="form-grid" onSubmit={savePrice}>
            <h3 className="field-full">Prix</h3>
            <p className="muted field-full">Le prix et la devise doivent être saisis réellement avant toute publication.</p>
            <div className="field"><label htmlFor="book-price">Prix réel</label><input id="book-price" required type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
            <div className="field"><label htmlFor="book-currency">Devise (ISO 4217)</label><input id="book-currency" required maxLength={3} pattern="[A-Za-z]{3}" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></div>
            <div className="field-full workflow-actions">
              <button className="button" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer et prévisualiser"}</button>
              <button type="button" className="button button-secondary" onClick={() => goToStep(3)} disabled={busy}>Retour</button>
            </div>
          </form>
        )}

        {activeStep === 5 && workflowBook && (
          <section aria-labelledby="preview-step-title">
            <h3 id="preview-step-title">Prévisualisation</h3>
            <p className="muted">Cette prévisualisation reprend uniquement les informations enregistrées et les fichiers téléversés.</p>
            <div className="book-preview">
              {coverPreviewUrl ? <Image className="admin-thumb" src={coverPreviewUrl} width={160} height={216} unoptimized alt={`Couverture uploadée de ${workflowBook.title}`} /> : <p className="notice">Aucune couverture fournie.</p>}
              <div>
                <p className="eyebrow">{workflowBook.status}</p>
                <h4>{workflowBook.title}</h4>
                <p>{workflowBook.author}</p>
                <p>{workflowBook.price_amount === null || !workflowBook.currency ? "Prix non renseigné" : `${workflowBook.price_amount} ${workflowBook.currency}`}</p>
                {workflowBook.description && <p>{workflowBook.description}</p>}
                {workflowBook.excerpt && <blockquote>{workflowBook.excerpt}</blockquote>}
                <p className="muted">PDF original : {pdfUploaded ? "enregistré dans le stockage privé" : "non fourni"}</p>
              </div>
            </div>
            <div className="workflow-actions">
              <button type="button" className="button" onClick={() => goToStep(6)}>Continuer vers la publication</button>
              <button type="button" className="button button-secondary" onClick={() => goToStep(4)}>Retour au prix</button>
            </div>
          </section>
        )}

        {activeStep === 6 && workflowBook && (
          <section aria-labelledby="publication-step-title">
            <h3 id="publication-step-title">Publication</h3>
            <p className="muted">La publication exige un prix, une devise et un PDF original réellement enregistré. La couverture reste facultative.</p>
            <ul>
              <li>Prix et devise : {workflowBook.price_amount !== null && workflowBook.currency ? "prêts" : "à compléter"}</li>
              <li>PDF original : {pdfUploaded ? "prêt" : "à compléter"}</li>
              <li>Couverture : {coverPreviewUrl ? "fournie" : "absente (facultative)"}</li>
            </ul>
            <div className="workflow-actions">
              <button type="button" className="button" onClick={() => void setStatus(workflowBook, "PUBLISHED")} disabled={busyForWorkflowBook || workflowBook.status === "PUBLISHED"}>{workflowBook.status === "PUBLISHED" ? "Livre déjà publié" : "Publier le livre"}</button>
              <button type="button" className="button button-secondary" onClick={() => goToStep(5)} disabled={busyForWorkflowBook}>Retour à la prévisualisation</button>
            </div>
          </section>
        )}
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status" aria-live="polite">{notice}</p>}

      <section className="admin-list" aria-labelledby="book-list-title">
        <h2 id="book-list-title" className="display">Fiches enregistrées</h2>
        {books.length === 0 ? <p className="notice">Aucun livre réel n’a encore été ajouté.</p> : books.map((book) => (
          <article className="admin-item" key={book.id}>
            <div className="admin-item-main">
              {book.cover_url && <Image className="admin-thumb" src={book.cover_url} width={96} height={128} unoptimized alt={`Couverture uploadée de ${book.title}`} />}
              <div>
                <span className="eyebrow">{book.status}</span>
                <h3>{book.title}</h3>
                <p>{book.author} · {priceLabel(book)}</p>
                <p className="muted">PDF original : {book.has_original_pdf ? "stocké en privé" : "non fourni"} · Couverture : {book.cover_url ? "fournie" : "absente"}</p>
              </div>
            </div>
            <div className="admin-actions">
              <button type="button" className="button button-secondary" onClick={() => beginEdit(book)}>Modifier la fiche</button>
              <select aria-label={`Statut de ${book.title}`} value={book.status} disabled={busyBook === book.id} onChange={(e) => void setStatus(book, e.target.value as BookStatus)}>
                <option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="HIDDEN">Masqué</option><option value="ARCHIVED">Archivé</option>
              </select>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
