import Link from "next/link";
import { EmptyState } from "@/src/components/empty-state";
import { ProductCard } from "@/src/components/product-card";
import { getPublishedBook, listPublishedProducts } from "@/src/lib/data/public";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    path: "/",
    title: "Maison Karidja",
    description: "Le site officiel des publications et créations de DIALLO Karidja.",
  });
}

export default async function HomePage() {
  const [bookResult, productsResult] = await Promise.all([getPublishedBook(), listPublishedProducts()]);
  const book = bookResult.data;

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Maison Karidja</span>
            <h1 className="display hero-title">Le livre et les créations de Karidja.</h1>
            <p>Une Seule Histoire — un livre de DIALLO Karidja. Découvrez ici les contenus publiés par son autrice et les créations qu’elle choisit de partager.</p>
            <div className="button-row">
              <Link className="button" href="/livre">Découvrir le livre</Link>
              <Link className="button button-secondary" href="/boutique">Parcourir la boutique</Link>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true"><div className="hero-visual-inner">MK</div></div>
        </div>
      </section>

      <section className="section container" aria-labelledby="book-section-title">
        <div className="section-heading">
          <span className="eyebrow">Le livre</span>
          <h2 id="book-section-title" className="display">Une Seule Histoire</h2>
        </div>
        {book ? (
          <div className="book-feature">
            <div className="book-feature-side">
              {book.cover_url ? (
                // Seule une couverture réellement uploadée et publiée par Karidja est affichée.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.cover_url} alt={`Couverture publiée de ${book.title}`} style={{ maxHeight: 280, maxWidth: "100%", objectFit: "contain" }} />
              ) : <span>{book.title}</span>}
            </div>
            <div className="book-feature-copy">
              <span className="eyebrow">Livre numérique</span>
              <h3>{book.author}</h3>
              {book.description && <p className="muted">{book.description}</p>}
              <Link className="button" href="/livre">Voir la fiche publiée</Link>
            </div>
          </div>
        ) : (
          <EmptyState title={bookResult.unavailable ? "La fiche du livre n’est pas disponible" : "La fiche du livre n’est pas encore publiée"}>
            <p>{bookResult.configured ? "La fiche apparaîtra ici après sa publication par Karidja." : "Le titre et l’autrice sont présentés à titre d’identification. La couverture, la description, le prix et les commandes n’apparaîtront qu’après publication réelle par Karidja."}</p>
          </EmptyState>
        )}
      </section>

      <section className="section container" aria-labelledby="products-section-title">
        <div className="section-heading">
          <span className="eyebrow">La boutique</span>
          <h2 id="products-section-title" className="display">Créations publiées</h2>
          <p className="muted">Seuls les articles publiés par Karidja sont affichés.</p>
        </div>
        {productsResult.data.length ? (
          <div className="product-grid">{productsResult.data.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} />)}</div>
        ) : (
          <EmptyState title={productsResult.unavailable ? "La boutique n’est pas disponible" : "Aucun article publié pour le moment"}>
            <p>{productsResult.configured ? "Les articles apparaîtront ici après leur publication par Karidja." : "Le catalogue apparaîtra ici après la configuration du service et la publication d’articles réels."}</p>
          </EmptyState>
        )}
      </section>
    </>
  );
}
