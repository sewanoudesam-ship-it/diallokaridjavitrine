"use client";

import Link from "next/link";
import { useCart } from "@/src/components/cart-provider";

export function SiteHeader() {
  const { itemCount } = useCart();

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand-wordmark" aria-label="Maison Karidja — accueil">
          <span className="brand-mark" aria-hidden="true">MK</span>
          <span>Maison Karidja</span>
        </Link>
        <nav className="site-nav" aria-label="Navigation principale">
          <Link href="/livre">Le livre</Link>
          <Link href="/boutique">La boutique</Link>
          <Link href="/a-propos">À propos</Link>
        </nav>
        <Link href="/panier" className="cart-link" aria-label={`Panier, ${itemCount} article${itemCount === 1 ? "" : "s"}`}>
          <span>Panier</span>
          {itemCount > 0 && <span className="cart-count" aria-hidden="true">{itemCount}</span>}
        </Link>
      </div>
    </header>
  );
}
