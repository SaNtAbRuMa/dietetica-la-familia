"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import type { Product } from "@/types/catalog";
import { createCartStore, CART_KEY } from "./store";
type Store = ReturnType<typeof createCartStore>;
const Context = createContext<Store | null>(null);
const ProductsContext = createContext<readonly Product[]>([]);
export function CartProvider({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  const [store] = useState(() => createCartStore(products));
  useEffect(() => {
    const hydrate = () => {
      try {
        const value: unknown = JSON.parse(
          localStorage.getItem(CART_KEY) ?? "null",
        );
        store
          .getState()
          .hydrate(
            value &&
              typeof value === "object" &&
              "version" in value &&
              value.version === 1 &&
              "lines" in value
              ? value.lines
              : [],
          );
      } catch {
        store.getState().hydrate([]);
      }
    };
    hydrate();
    const sync = (event: StorageEvent) => {
      if (event.key === CART_KEY || event.key === null) hydrate();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [store]);
  return (
    <Context.Provider value={store}>
      <ProductsContext.Provider value={products}>
        {children}
      </ProductsContext.Provider>
    </Context.Provider>
  );
}
export function useCart<T>(
  selector: (state: ReturnType<Store["getState"]>) => T,
) {
  const store = useContext(Context);
  if (!store) throw new Error("CartProvider required");
  return useStore(store, selector);
}
export const useCatalog = () => useContext(ProductsContext);
