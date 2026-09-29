import type { Metadata } from "next";
import { EmptyState } from "@/src/components/empty-state";
import { BookOrderForm } from "@/src/components/book-order-form";
import { formatPrice } from "@/src/lib/money";
import { getPublishedBook } from "@/src/lib/data/public";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPublishedBook();
  const book = result.data;
  return pageMetadata({
    path: "/livre",
    title: book?.title ?? "Une Seule Histoire",
    description: book?.description || "La fiche officielle du livre Une Seule Histoire de DIALLO Karidja.",
    image: book?.cover_url,
    noindex: !book,
  });
}

export default async function BookPage() {
  const result = await getPublishedBook();
  const book = result.data;
  return (
    <section className="content-page container">
      <div className="section-heading">
        <span className="eyebrow">Publication de DIALLO Karidja</span>
        <h1 className="display page-title">{book?.title ?? "Une Seule Histoire"}</h1>
      </div>
      {!book ? (
        <EmptyState title={result.unavailable ? "Le service du livre est indisponible" : "La fiche de vente n’est pas encore publiée"}>
          <p>{result.configured ? "La couverture, la description, le prix et le formulaire de commande seront affichés après publication des données réelles par Karidja." : "Aucune couverture, aucun prix ni aucune commande fictive ne sont affichés. La fiche sera disponible après configuration et publication."}</p>
        </EmptyState>
      ) : (
        <div className="book-detail">
          <div className="book-detail-cover">
            {book.cover_url ? (
              // Image exclusivement issue de la couverture uploadée par Karidja.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover_url} alt={`Couverture publiée de ${book.title}`} />
            ) : <div className="cover-empty" aria-label="Aucune couverture publiée">{book.title}</div>}
          </div>
          <div className="book-detail-copy">
            <p className="eyebrow">Livre numérique</p>
            <p>Par {book.author}</p>
            {book.description && <div className="prose">{book.description}</div>}
            {book.excerpt && <blockquote className="book-excerpt">{book.excerpt}</blockquote>}
            <p className="book-price">{formatPrice(book.price_amount, book.currency)}</p>
            <h2 className="display">Demander le livre</h2>
            <p className="muted">La commande reste en attente jusqu’à la vérification manuelle du paiement par Maison Karidja.</p>
            <BookOrderForm bookId={book.id} />
          </div>
        </div>
      )}
    </section>
  );
}
