import type { Metadata } from "next";
import { CheckoutForm } from "@/features/checkout/checkout-form";
export const metadata: Metadata = {
  title: "Revisá tu selección",
  robots: { index: false, follow: false },
};
export default function Checkout() {
  return (
    <div className="container page-space">
      <div className="page-heading">
        <p className="eyebrow">Lo bueno está cerca</p>
        <h1>Un paso más cerca de tu despensa.</h1>
        <p>Completá tus datos y revisá tu selección.</p>
      </div>
      <CheckoutForm />
    </div>
  );
}
