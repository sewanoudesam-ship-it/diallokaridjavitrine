import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/src/components/add-to-cart-button";
import { EmptyState } from "@/src/components/empty-state";
import { getPublishedProduct } from "@/src/lib/data/public";
import { formatPrice } from "@/src/lib/money";
import { pageMetadata } from "@/src/lib/seo";

type ProductRouteProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProductRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedProduct(slug);
  if (result.unavailable) return { title: "Boutique momentanément indisponible", robots: { index: false, follow: false } };
  if (!result.data) return { title: "Article introuvable", robots: { index: false, follow: false } };
  const product = result.data;
  return pageMetadata({
    path: `/boutique/${encodeURIComponent(product.slug)}`,
    title: product.name,
    description: product.description || `${product.name}, fiche d’un article publié par Karidja sur Maison Karidja.`,
    image: product.image_url,
  });
}

export default async function ProductDetailPage({ params }: ProductRouteProps) {
  const { slug } = await params;
  const result = await getPublishedProduct(slug);
  if (result.unavailable) {
    return (
      <section className="content-page container">
        <EmptyState title="Cette fiche n’est pas disponible pour le moment">
          <p>Le catalogue ne peut pas être chargé actuellement. Vos informations et commandes ne sont pas modifiées. Réessayez un peu plus tard.</p>
          <Link className="button button-secondary" href="/boutique">Retour à la boutique</Link>
        </EmptyState>
      </section>
    );
  }
  if (!result.data) notFound();
  const product = result.data;

  return (
    <section className="content-page container">
      <p className="eyebrow"><Link href="/boutique">Boutique</Link> / {product.name}</p>
      <div className="product-detail">
        <div className="product-detail-image">
          {product.image_url ? (
            // Image uniquement uploadée et publiée par Karidja.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} />
          ) : <div className="cover-empty" aria-label={`Aucune image publiée pour ${product.name}`} />}
        </div>
        <div className="product-detail-copy">
          <h1 className="display page-title">{product.name}</h1>
          {product.category && <p className="eyebrow">{product.category}</p>}
          <p className="muted">Référence : {product.reference}</p>
          <p className={product.availability === "AVAILABLE" ? "availability available" : "availability unavailable"}>
            {product.availability === "AVAILABLE" ? "Disponible" : "Indisponible"}
          </p>
          {product.description && <p className="prose">{product.description}</p>}
          <p className="book-price">{formatPrice(product.price_amount, product.currency)}</p>
          <AddToCartButton productId={product.id} available={product.availability === "AVAILABLE"} />
        </div>
      </div>
      <p className="form-note">La commande est préparée dans le panier. WhatsApp s’ouvre avec un texte que vous vérifiez et envoyez vous-même.</p>
    </section>
  );
}
