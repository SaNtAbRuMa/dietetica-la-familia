"use client";
import { createStore } from "zustand/vanilla";
import type { Product } from "@/types/catalog";
import type { CartLine } from "./types";
import { sanitizeCart } from "./logic";
export const CART_KEY = "raiz-natural:cart:v1";
type CartState = {
  lines: CartLine[];
  hydrated: boolean;
  open: boolean;
  storageError: boolean;
  setOpen: (open: boolean) => void;
  hydrate: (input: unknown) => void;
  add: (line: CartLine) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};
export function createCartStore(products: readonly Product[]) {
  return createStore<CartState>()((set, get) => {
    function save(input: unknown) {
      const lines = sanitizeCart(input, products);
      let storageError = false;
      try {
        localStorage.setItem(CART_KEY, JSON.stringify({ version: 1, lines }));
      } catch {
        storageError = true;
      }
      set({ lines, storageError });
    }
    return {
      lines: [],
      hydrated: false,
      open: false,
      storageError: false,
      setOpen: (open) => set({ open }),
      hydrate: (input) =>
        set({ lines: sanitizeCart(input, products), hydrated: true }),
      add: (line) => {
        if (get().hydrated) {
          save([...get().lines, line]);
          set({ open: true });
        }
      },
      setQuantity: (id, quantity) => {
        if (Number.isSafeInteger(quantity) && quantity > 0)
          save(
            get().lines.map((l) =>
              l.variantId === id ? { ...l, quantity } : l,
            ),
          );
      },
      remove: (id) => save(get().lines.filter((l) => l.variantId !== id)),
      clear: () => save([]),
    };
  });
}
