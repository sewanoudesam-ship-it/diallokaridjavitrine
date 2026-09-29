"use client";

import { useState } from "react";
import { useCart } from "@/src/components/cart-provider";

export function AddToCartButton({ productId, available = true }: { productId: string; available?: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  if (!available) return <p className="notice">Cet article est actuellement indisponible.</p>;
  return (
    <div className="add-to-cart-action">
      <button
        className="button"
        type="button"
        onClick={() => { addItem(productId); setAdded(true); }}
      >
        Ajouter au panier
      </button>
      {added && <p className="form-success" role="status">Article ajouté au panier.</p>}
    </div>
  );
}
