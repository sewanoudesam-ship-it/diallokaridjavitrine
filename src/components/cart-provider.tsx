"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export interface CartItem { productId: string; quantity: number }
interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "maison-karidja-cart-v1";
const EMPTY_CART: CartItem[] = [];
const CartContext = createContext<CartContextValue | null>(null);
const listeners = new Set<() => void>();
let cartSnapshot: CartItem[] = EMPTY_CART;

function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, number>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const { productId, quantity } = row as Record<string, unknown>;
    if (typeof productId !== "string" || !productId || typeof quantity !== "number" || !Number.isInteger(quantity)) continue;
    byId.set(productId, Math.max(1, Math.min(99, quantity)));
  }
  return [...byId].map(([productId, quantity]) => ({ productId, quantity }));
}

function readStoredCart(): CartItem[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? sanitizeCart(JSON.parse(saved)) : EMPTY_CART;
  } catch {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    return EMPTY_CART;
  }
}

function sameCart(left: CartItem[], right: CartItem[]) {
  return left.length === right.length && left.every((item, index) => item.productId === right[index]?.productId && item.quantity === right[index]?.quantity);
}

function notifySubscribers() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const latest = readStoredCart();
    if (!sameCart(latest, cartSnapshot)) {
      cartSnapshot = latest;
      listener();
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = readStoredCart();
      if (sameCart(next, cartSnapshot)) return;
      cartSnapshot = next;
      notifySubscribers();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      listeners.delete(listener);
    };
  }
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cartSnapshot;
}

function getServerSnapshot() {
  return EMPTY_CART;
}

function updateCart(updater: (current: CartItem[]) => CartItem[]) {
  const next = sanitizeCart(updater(cartSnapshot));
  cartSnapshot = next;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* The in-memory cart remains usable. */ }
  }
  notifySubscribers();
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    addItem(productId) {
      updateCart((current) => {
        const existing = current.find((item) => item.productId === productId);
        if (existing) return current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item);
        return [...current, { productId, quantity: 1 }];
      });
    },
    setQuantity(productId, quantity) {
      if (quantity <= 0) {
        updateCart((current) => current.filter((item) => item.productId !== productId));
      } else {
        updateCart((current) => current.map((item) => item.productId === productId ? { ...item, quantity: Math.max(1, Math.min(99, Math.floor(quantity))) } : item));
      }
    },
    removeItem(productId) { updateCart((current) => current.filter((item) => item.productId !== productId)); },
    clearCart() { updateCart(() => EMPTY_CART); },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
