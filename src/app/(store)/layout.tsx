import type { ReactNode } from "react";
import { catalog } from "@/server/catalog";
import { CartProvider } from "@/features/cart/provider";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { FloatingWhatsApp } from "@/components/layout/floating-whatsapp";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  const products = await catalog.listProducts();
  const cartProducts = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: "",
    shortDescription: "",
    ingredients: "",
    allergens: "",
    storage: "",
    tags: [],
    featured: false,
    images: p.images.slice(0, 1),
    categoryId: p.categoryId,
    isVisible: p.isVisible,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      price: v.price,
      stock: v.stock,
      ...(v.image ? { image: v.image } : {}),
    })),
  }));

  return (
    <CartProvider products={cartProducts}>
      <a href="#contenido" className="skip-link">
        Ir al contenido
      </a>
      <StoreHeader />
      <main id="contenido" className="store-main">
        {children}
      </main>
      <StoreFooter />
      <FloatingWhatsApp />
    </CartProvider>
  );
}
