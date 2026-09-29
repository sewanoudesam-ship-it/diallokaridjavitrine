import type { Metadata } from "next";
import { EmptyState } from "@/src/components/empty-state";
import { ProductCard } from "@/src/components/product-card";
import { listPublishedProducts } from "@/src/lib/data/public";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  path: "/boutique",
  title: "Boutique",
  description: "Les créations réellement publiées par Karidja dans la boutique Maison Karidja.",
});

export default async function BoutiquePage() {
  const result = await listPublishedProducts();
  return (
    <section className="content-page container">
      <div className="section-heading">
        <span className="eyebrow">Maison Karidja</span>
        <h1 className="display page-title">La boutique</h1>
        <p className="muted">Les fiches et images affichées proviennent exclusivement des publications de Karidja.</p>
      </div>
      {result.data.length ? (
        <div className="product-grid">{result.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      ) : (
        <EmptyState title={result.unavailable ? "La boutique n’est pas disponible" : "Aucun article publié"}>
          <p>{result.configured ? "Les articles apparaîtront ici après leur publication par Karidja." : "Le catalogue apparaîtra ici après configuration de la base et publication d’articles réels."}</p>
        </EmptyState>
      )}
    </section>
  );
}
