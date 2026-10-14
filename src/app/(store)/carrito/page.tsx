import type { Metadata } from "next";
import { CartContent } from "@/features/cart/cart-content";
export const metadata: Metadata = {
  title: "Tu carrito",
  robots: { index: false, follow: false },
};
export default function CartPage() {
  return (
    <div className="container page-space cart-page">
      <div className="page-heading">
        <p className="eyebrow">A tu medida</p>
        <h1>Tu carrito, lleno de cosas buenas.</h1>
        <p>Revisá tu selección antes de continuar.</p>
      </div>
      <CartContent />
    </div>
  );
}
