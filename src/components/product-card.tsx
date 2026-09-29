"use client";

import Link from "next/link";
import { useCart } from "@/src/components/cart-provider";
import { formatPrice } from "@/src/lib/money";
import type { PublicProduct } from "@/src/lib/types";

export function ProductCard({ product }: { product: PublicProduct }) {
  const { addItem } = useCart();
  const available = product.availability === "AVAILABLE";
  return (
    <article className="product-card">
      <Link href={`/boutique/${encodeURIComponent(product.slug)}`} aria-label={`Voir ${product.name}`}>
        {product.image_url ? (
          // The source is an image uploaded and published by Karidja, never a fallback stock image.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="product-image" src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-image" role="img" aria-label={`Aucune image publiée pour ${product.name}`} />
        )}
        <div className="product-card-copy">
          {product.category && <span className="eyebrow">{product.category}</span>}
          <h3>{product.name}</h3>
          <p className="muted">Référence : {product.reference}</p>
          <p className="product-price">{formatPrice(product.price_amount, product.currency)}</p>
          <p className={available ? "availability available" : "availability unavailable"}>
            {available ? "Disponible" : "Indisponible"}
          </p>
        </div>
      </Link>
      <div className="product-card-copy product-card-actions">
        <button className="button button-secondary" type="button" disabled={!available} onClick={() => addItem(product.id)}>
          {available ? "Ajouter au panier" : "Indisponible"}
        </button>
      </div>
    </article>
  );
}
