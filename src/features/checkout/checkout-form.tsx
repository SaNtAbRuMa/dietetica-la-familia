"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Truck,
  Store,
  CreditCard,
  Wallet,
  ShieldCheck,
  Lock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { useCart, useCatalog } from "@/features/cart/provider";
import { resolveCart, cartSubtotal } from "@/features/cart/logic";
import { CartContent } from "@/features/cart/cart-content";
import { siteConfig } from "@/config/site";
import { formatCurrency } from "@/lib/format-currency";
import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  CabalIcon,
  NaranjaIcon,
  MercadoPagoBadge,
  detectCardBrand,
  formatCardNumber,
  formatExpiration,
} from "@/components/checkout/payment-brand-icons";

type CompletedOrderSummary = {
  orderId: string;
  subtotal: number;
  unitCount: number;
  syncedToSheet: boolean;
  stockUpdatedInSheet: boolean;
  customerName: string;
  deliveryMethod: "home_delivery" | "store_pickup";
  pickupBranch?: "centro" | "urquiza" | undefined;
  paymentMethod: "tarjeta" | "mercadopago" | "coordina";
  paymentStatus?: "approved" | "pending" | "rejected" | undefined;
  cardDetails?:
    | {
        brand?: string | undefined;
        lastFour?: string | undefined;
        installments?: number | undefined;
      }
    | undefined;
  mpConfigured: boolean;
  whatsappText: string;
};

declare global {
  interface Window {
    MercadoPago?: new (
      key: string,
      options?: { locale?: string }
    ) => {
      checkout: (options: {
        preference: { id: string };
        autoOpen?: boolean;
      }) => void;
    };
  }
}

export function CheckoutForm() {
  const cart = useCart((s) => s);
  const products = useCatalog();
  const lines = resolveCart(cart.lines, products);
  const subtotal = cartSubtotal(lines);
  const qualifiesForFreeDelivery = subtotal >= siteConfig.freeShippingThreshold;

  // Delivery & Pickup State
  const [delivery, setDelivery] = useState<"home_delivery" | "store_pickup">(
    "home_delivery",
  );
  const [pickupBranch, setPickupBranch] = useState<"centro" | "urquiza">(
    "centro",
  );

  // Payment Method State: "tarjeta" | "mercadopago" | "coordina"
  const [paymentMethod, setPaymentMethod] = useState<
    "tarjeta" | "mercadopago" | "coordina"
  >("tarjeta");

  // In-Page Card Payment State
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardDni, setCardDni] = useState("");
  const [installments, setInstallments] = useState<number>(1);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // Loading & Submission State
  const [pending, setPending] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [completedOrder, setCompletedOrder] =
    useState<CompletedOrderSummary | null>(null);
  const [result, setResult] = useState<{
    message: string;
    key: string;
    error: boolean;
  } | null>(null);

  const key = JSON.stringify(cart.lines);
  const cleanCardDigits = cardNumber.replace(/\D/g, "");
  const detectedBrand = detectCardBrand(cleanCardDigits);

  // Load Mercado Pago SDK script dynamically for in-page checkout modal
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("mp-sdk-v2")) {
      const script = document.createElement("script");
      script.id = "mp-sdk-v2";
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  function handleCardNumberChange(val: string) {
    const formatted = formatCardNumber(val);
    setCardNumber(formatted);
    if (cardErrors.cardNumber) {
      setCardErrors((prev) => ({ ...prev, cardNumber: "" }));
    }
  }

  function handleExpiryChange(val: string) {
    const formatted = formatExpiration(val);
    setCardExpiry(formatted);
    if (cardErrors.cardExpiry) {
      setCardErrors((prev) => ({ ...prev, cardExpiry: "" }));
    }
  }

  function handleCvvChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    setCardCvv(digits);
    if (cardErrors.cardCvv) {
      setCardErrors((prev) => ({ ...prev, cardCvv: "" }));
    }
  }

  function handleDniChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 9);
    setCardDni(digits);
    if (cardErrors.cardDni) {
      setCardErrors((prev) => ({ ...prev, cardDni: "" }));
    }
  }

  function validateCardFields(): boolean {
    if (paymentMethod !== "tarjeta") return true;
    const errors: Record<string, string> = {};

    if (cleanCardDigits.length < 15) {
      errors.cardNumber = "Ingresá un número de tarjeta válido (16 dígitos).";
    }
    if (cardholderName.trim().length < 3) {
      errors.cardholderName = "Ingresá el nombre y apellido tal como figura en la tarjeta.";
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      errors.cardExpiry = "Formato MM/AA inválido.";
    }
    if (cardCvv.length < 3) {
      errors.cardCvv = "Ingresá los 3 dígitos de seguridad (CVV).";
    }
    if (cardDni.length < 7) {
      errors.cardDni = "Ingresá el DNI del titular de la tarjeta.";
    }

    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateCardFields()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const getStr = (name: string) => {
      const val = formData.get(name);
      return typeof val === "string" ? val.trim() : "";
    };

    const customer = {
      firstName: getStr("firstName"),
      lastName: getStr("lastName"),
      email: getStr("email"),
      phone: getStr("phone"),
      deliveryMethod: delivery,
      ...(delivery === "home_delivery"
        ? {
            address: getStr("address"),
            city: getStr("city"),
            province: getStr("province"),
            postalCode: getStr("postalCode"),
          }
        : {
            pickupBranch,
          }),
      ...(getStr("notes") ? { notes: getStr("notes") } : {}),
    };

    setPending(true);
    setResult(null);

    if (paymentMethod === "tarjeta") {
      setProcessingStep("Conectando con la entidad bancaria segura…");
    } else if (paymentMethod === "mercadopago") {
      setProcessingStep("Generando orden en Mercado Pago…");
    } else {
      setProcessingStep("Registrando tu pedido…");
    }

    try {
      const cardPayload =
        paymentMethod === "tarjeta"
          ? {
              brand: detectedBrand.toUpperCase(),
              lastFour: cleanCardDigits.slice(-4),
              installments,
              cardholderName: cardholderName.trim().toUpperCase(),
              cardholderDni: cardDni.trim(),
            }
          : undefined;

      const response = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items: cart.lines,
          paymentMethod,
          ...(cardPayload ? { cardPayment: cardPayload } : {}),
        }),
      });

      const value: unknown = await response.json();
      if (
        !response.ok ||
        !value ||
        typeof value !== "object" ||
        !("orderId" in value) ||
        typeof value.orderId !== "string" ||
        !("subtotal" in value) ||
        typeof value.subtotal !== "number"
      ) {
        const errMsg =
          value &&
          typeof value === "object" &&
          "error" in value &&
          typeof value.error === "string"
            ? value.error
            : "No pudimos confirmar tu pedido. Revisá el carrito e intentá nuevamente.";
        throw new Error(errMsg);
      }

      const checkoutUrl =
        "checkoutUrl" in value && typeof value.checkoutUrl === "string"
          ? value.checkoutUrl
          : null;

      // Redirigir a Mercado Pago de verdad si el checkoutUrl fue generado por la API
      if (paymentMethod === "mercadopago" && checkoutUrl) {
        cart.clear();
        setProcessingStep("Redirigiendo a la pasarela segura de Mercado Pago…");
        window.location.assign(checkoutUrl);
        return;
      }

      // Artificial short delay for realistic secure in-page card validation
      if (paymentMethod === "tarjeta") {
        setProcessingStep("Autorizando transacción con el emisor…");
        await new Promise((r) => setTimeout(r, 700));
      }

      const itemLinesText = lines
        .map(
          (l) =>
            `- ${l.quantity}x ${l.product.name} (${l.variant.size}): ${formatCurrency(l.total)}`,
        )
        .join("\n");
      const branchLabel =
        pickupBranch === "centro"
          ? "Sucursal Centro (Rivadavia 2581 esq. Cnel. Suárez)"
          : "Sucursal Urquiza (Av. Urquiza 1315 esq. Rendón)";

      const paymentMethodLabel =
        paymentMethod === "tarjeta"
          ? `Tarjeta de Débito/Crédito (${detectedBrand.toUpperCase()} terminada en ${cleanCardDigits.slice(-4)}) · APROBADO`
          : paymentMethod === "mercadopago"
            ? "Mercado Pago (solicito confirmación / link)"
            : "A coordinar (Efectivo / Transferencia)";

      const whatsappText = [
        `Hola! Hice el pedido #${value.orderId} en la web de Dietética La Familia:`,
        itemLinesText,
        `Total: ${formatCurrency(value.subtotal)}`,
        `Medio de pago: ${paymentMethodLabel}`,
        `Entrega: ${
          delivery === "home_delivery"
            ? `Envío a domicilio (${"address" in customer ? customer.address : ""}, ${"city" in customer ? customer.city : "Olavarría"})`
            : `Retiro en sucursal: ${branchLabel}`
        }`,
        `Nombre: ${customer.firstName} ${customer.lastName}`,
      ].join("\n");

      const summary: CompletedOrderSummary = {
        orderId: value.orderId,
        subtotal: value.subtotal,
        unitCount:
          "unitCount" in value && typeof value.unitCount === "number"
            ? value.unitCount
            : 1,
        syncedToSheet:
          "syncedToSheet" in value && typeof value.syncedToSheet === "boolean"
            ? value.syncedToSheet
            : false,
        stockUpdatedInSheet:
          "stockUpdatedInSheet" in value &&
          typeof value.stockUpdatedInSheet === "boolean"
            ? value.stockUpdatedInSheet
            : false,
        customerName: `${customer.firstName} ${customer.lastName}`,
        deliveryMethod: delivery,
        paymentMethod,
        paymentStatus: paymentMethod === "tarjeta" ? "approved" : "pending",
        mpConfigured:
          "mpConfigured" in value && typeof value.mpConfigured === "boolean"
            ? value.mpConfigured
            : false,
        whatsappText,
        ...(delivery === "store_pickup" ? { pickupBranch } : {}),
        ...(paymentMethod === "tarjeta"
          ? {
              cardDetails: {
                brand: detectedBrand.toUpperCase(),
                lastFour: cleanCardDigits.slice(-4),
                installments,
              },
            }
          : {}),
      };

      setCompletedOrder(summary);
      cart.clear();
    } catch (err) {
      setResult({
        message:
          err instanceof Error
            ? err.message
            : "No pudimos procesar tu pedido. Revisá el carrito e intentá nuevamente.",
        key,
        error: true,
      });
    } finally {
      setPending(false);
      setProcessingStep("");
    }
  }

  // Completed Order View (Digital Receipt)
  if (completedOrder) {
    const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
      completedOrder.whatsappText,
    )}`;

    const isCardApproved =
      completedOrder.paymentMethod === "tarjeta" &&
      completedOrder.paymentStatus === "approved";

    return (
      <div className="checkout-success-wrap" role="status" aria-live="polite">
        <div className="approved-receipt-box">
          <div className="receipt-header">
            <div className="receipt-icon-approved">
              <CheckCircle2 size={30} />
            </div>
            <div>
              <span className="receipt-badge-status">
                {isCardApproved ? "PAGO ONLINE APROBADO" : "PEDIDO REGISTRADO"}
              </span>
              <h2 className="receipt-title">
                {isCardApproved
                  ? "¡Pago procesado con éxito!"
                  : `¡Gracias por tu pedido, ${completedOrder.customerName}!`}
              </h2>
            </div>
          </div>

          <p className="receipt-subtitle">
            {isCardApproved
              ? `Tu pago con tarjeta fue validado y autorizado. Hemos registrado el pedido #${completedOrder.orderId} con stock reservado.`
              : `Registramos tu pedido #${completedOrder.orderId} en nuestro sistema de Olavarría.`}
          </p>

          <div className="receipt-meta-grid">
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Número de orden</span>
              <strong className="receipt-meta-val">#{completedOrder.orderId}</strong>
            </div>
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Total pagado</span>
              <strong className="receipt-meta-val text-green">
                {formatCurrency(completedOrder.subtotal)}
              </strong>
            </div>
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Medio de cobro</span>
              <span className="receipt-meta-val">
                {completedOrder.paymentMethod === "tarjeta"
                  ? `Tarjeta ${completedOrder.cardDetails?.brand ?? "Online"} •••• ${completedOrder.cardDetails?.lastFour ?? ""}`
                  : completedOrder.paymentMethod === "mercadopago"
                    ? "Mercado Pago"
                    : "Efectivo / Transferencia"}
              </span>
            </div>
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Modalidad de entrega</span>
              <span className="receipt-meta-val">
                {completedOrder.deliveryMethod === "home_delivery"
                  ? "Envío a domicilio"
                  : `Retiro: Sucursal ${completedOrder.pickupBranch === "centro" ? "Centro" : "Urquiza"}`}
              </span>
            </div>
          </div>

          {completedOrder.paymentMethod === "mercadopago" && !completedOrder.mpConfigured && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "12px 14px",
                margin: "18px 0 6px",
                fontSize: "13px",
                lineHeight: "1.45",
                color: "#166534",
              }}
            >
              <strong>💡 Para cobrar directo a tu cuenta:</strong> Ingresá tu{" "}
              <code style={{ background: "#dcfce7", padding: "1px 5px", borderRadius: "3px" }}>
                MP_ACCESS_TOKEN
              </code>{" "}
              en <code>.env.local</code>. Una vez guardado, el cliente será redirigido automáticamente a la pasarela oficial de Mercado Pago para abonar a tu cuenta.
            </div>
          )}

          <div className="receipt-actions">
            <Button
              render={
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              nativeButton={false}
              size="lg"
              className="btn-receipt-wa"
            >
              Enviar comprobante por WhatsApp ({siteConfig.whatsappDisplay})
              <ArrowRight size={16} />
            </Button>
            <Button
              variant="outline"
              render={<Link href="/productos" />}
              nativeButton={false}
              size="lg"
            >
              Seguir recorriendo la tienda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!cart.hydrated || !lines.length) return <CartContent />;

  return (
    <div className="checkout-grid">
      <form
        onSubmit={submit}
        onChange={() => setResult(null)}
        className="checkout-form"
      >
        {/* Paso 1: Datos Personales */}
        <section>
          <h2>1. Tus datos de contacto</h2>
          <p className="muted">
            Ingresá los datos del titular para la factura y la coordinación de entrega.
          </p>
          <div className="form-grid">
            {[
              {
                id: "firstName",
                label: "Nombre",
                auto: "given-name",
                type: "text",
              },
              {
                id: "lastName",
                label: "Apellido",
                auto: "family-name",
                type: "text",
              },
              { id: "email", label: "Email", auto: "email", type: "email" },
              { id: "phone", label: "Teléfono / WhatsApp", auto: "tel", type: "tel" },
            ].map((f) => (
              <Field key={f.id}>
                <FieldLabel htmlFor={f.id}>{f.label}</FieldLabel>
                <Input
                  id={f.id}
                  name={f.id}
                  type={f.type}
                  autoComplete={f.auto}
                  required
                  maxLength={120}
                  minLength={f.id === "phone" ? 6 : 2}
                />
              </Field>
            ))}
          </div>
        </section>

        {/* Paso 2: Entrega o Retiro */}
        <section>
          <h2>2. ¿Cómo querés recibir tu compra?</h2>
          <fieldset>
            <legend className="sr-only">Método de entrega</legend>
            <div className="delivery-options">
              <label className={delivery === "home_delivery" ? "selected" : ""}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="home_delivery"
                  checked={delivery === "home_delivery"}
                  onChange={() => setDelivery("home_delivery")}
                />
                <Truck size={20} />
                <span>
                  Envío a domicilio
                  <small>
                    {qualifiesForFreeDelivery
                      ? `¡Envío gratis aplicado! (compra ≥ ${formatCurrency(siteConfig.freeShippingThreshold)})`
                      : `Envío sin cargo desde ${formatCurrency(siteConfig.freeShippingThreshold)} en Olavarría`}
                  </small>
                </span>
              </label>
              <label className={delivery === "store_pickup" ? "selected" : ""}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="store_pickup"
                  checked={delivery === "store_pickup"}
                  onChange={() => setDelivery("store_pickup")}
                />
                <Store size={20} />
                <span>
                  Retiro en sucursal
                  <small>Urquiza 1315 o Rivadavia 2581 (sin cargo)</small>
                </span>
              </label>
            </div>
          </fieldset>

          {delivery === "home_delivery" ? (
            <div className="form-grid">
              <Field className="full-width">
                <FieldLabel htmlFor="address">Dirección y número</FieldLabel>
                <Input
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  required
                  minLength={5}
                  maxLength={200}
                  placeholder="Calle, altura, piso y departamento"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="city">Localidad</FieldLabel>
                <Input
                  id="city"
                  name="city"
                  defaultValue="Olavarría"
                  autoComplete="address-level2"
                  required
                  maxLength={100}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="province">Provincia</FieldLabel>
                <Input
                  id="province"
                  name="province"
                  defaultValue="Buenos Aires"
                  autoComplete="address-level1"
                  required
                  maxLength={100}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="postalCode">Código postal</FieldLabel>
                <Input
                  id="postalCode"
                  name="postalCode"
                  defaultValue="7400"
                  autoComplete="postal-code"
                  required
                  pattern="([0-9]{4}|[A-Za-z]\s*[0-9]{4}(\s*[A-Za-z]{3})?)"
                  title="Código postal (por ejemplo 7400)"
                  maxLength={10}
                />
              </Field>
            </div>
          ) : (
            <div className="pickup-box">
              <p className="pickup-title">
                Elegí en qué sucursal de Olavarría vas a retirar:
              </p>
              <div className="pickup-branches-grid">
                <label className={`pickup-branch-card ${pickupBranch === "centro" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="pickupBranch"
                    value="centro"
                    checked={pickupBranch === "centro"}
                    onChange={() => setPickupBranch("centro")}
                  />
                  <div>
                    <strong>Sucursal Centro</strong>
                    <small>Rivadavia 2581 (esq. Cnel. Suárez) · Horario corrido</small>
                  </div>
                </label>
                <label className={`pickup-branch-card ${pickupBranch === "urquiza" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="pickupBranch"
                    value="urquiza"
                    checked={pickupBranch === "urquiza"}
                    onChange={() => setPickupBranch("urquiza")}
                  />
                  <div>
                    <strong>Sucursal Urquiza</strong>
                    <small>Av. Urquiza 1315 (esq. Rendón) · Horario corrido</small>
                  </div>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Paso 3: Pago dentro de la página */}
        <section>
          <h2>3. ¿Cómo querés abonar?</h2>
          <fieldset>
            <legend className="sr-only">Método de pago</legend>
            <div className="payment-options-grid">
              {/* Tarjeta de Débito o Crédito */}
              <label className={paymentMethod === "tarjeta" ? "selected" : ""}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="tarjeta"
                  checked={paymentMethod === "tarjeta"}
                  onChange={() => setPaymentMethod("tarjeta")}
                />
                <CreditCard size={20} />
                <span>
                  Tarjeta de débito o crédito
                  <small>Pago online seguro en la tienda (Visa, Mastercard, Cabal)</small>
                </span>
              </label>

              {/* Mercado Pago */}
              <label className={paymentMethod === "mercadopago" ? "selected" : ""}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mercadopago"
                  checked={paymentMethod === "mercadopago"}
                  onChange={() => setPaymentMethod("mercadopago")}
                />
                <MercadoPagoBadge width={65} height={18} />
                <span>
                  Mercado Pago
                  <small>Dinero en cuenta, app o tarjetas asociadas</small>
                </span>
              </label>

              {/* Efectivo / Transferencia */}
              <label className={paymentMethod === "coordina" ? "selected" : ""}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="coordina"
                  checked={paymentMethod === "coordina"}
                  onChange={() => setPaymentMethod("coordina")}
                />
                <Wallet size={20} />
                <span>
                  Efectivo / Transferencia
                  <small>Abonás al retirar en local o al recibir tu pedido</small>
                </span>
              </label>
            </div>
          </fieldset>

          {/* Formulario integrado de Tarjeta de Débito / Crédito */}
          {paymentMethod === "tarjeta" && (
            <div className="card-checkout-panel">
              {/* Visual Card Preview */}
              <div className="visual-card" aria-hidden="true">
                <div className="visual-card-top">
                  <div className="card-chip" />
                  <div className="visual-card-brand">
                    {detectedBrand === "visa" && <VisaIcon width={45} height={28} />}
                    {detectedBrand === "mastercard" && <MastercardIcon width={45} height={28} />}
                    {detectedBrand === "amex" && <AmexIcon width={45} height={28} />}
                    {detectedBrand === "cabal" && <CabalIcon width={45} height={28} />}
                    {detectedBrand === "naranja" && <NaranjaIcon width={45} height={28} />}
                    {detectedBrand === "generic" && <CreditCard size={26} color="#ffffff" />}
                  </div>
                </div>

                <div className="visual-card-number">
                  {cardNumber || "•••• •••• •••• ••••"}
                </div>

                <div className="visual-card-bottom">
                  <div>
                    <div className="card-label-small">Titular de la tarjeta</div>
                    <div className="card-val">{cardholderName || "NOMBRE Y APELLIDO"}</div>
                  </div>
                  <div>
                    <div className="card-label-small">Vence</div>
                    <div className="card-val">{cardExpiry || "MM/AA"}</div>
                  </div>
                </div>
              </div>

              {/* Card Inputs */}
              <div className="form-grid">
                <Field className="full-width">
                  <FieldLabel htmlFor="cardNumber">Número de tarjeta</FieldLabel>
                  <div className="card-input-wrapper">
                    <Input
                      id="cardNumber"
                      name="cardNumber"
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      required
                    />
                    <div className="card-input-brand-badge">
                      {detectedBrand === "visa" && <VisaIcon width={32} height={20} />}
                      {detectedBrand === "mastercard" && <MastercardIcon width={32} height={20} />}
                      {detectedBrand === "amex" && <AmexIcon width={32} height={20} />}
                      {detectedBrand === "cabal" && <CabalIcon width={32} height={20} />}
                      {detectedBrand === "naranja" && <NaranjaIcon width={34} height={20} />}
                    </div>
                  </div>
                  {cardErrors.cardNumber && (
                    <span className="field-error">{cardErrors.cardNumber}</span>
                  )}
                </Field>

                <Field className="full-width">
                  <FieldLabel htmlFor="cardholderName">Nombre y apellido del titular</FieldLabel>
                  <Input
                    id="cardholderName"
                    name="cardholderName"
                    type="text"
                    autoComplete="cc-name"
                    value={cardholderName}
                    onChange={(e) => {
                      setCardholderName(e.target.value.toUpperCase());
                      if (cardErrors.cardholderName) {
                        setCardErrors((prev) => ({ ...prev, cardholderName: "" }));
                      }
                    }}
                    placeholder="Tal como figura en el plástico"
                    required
                  />
                  {cardErrors.cardholderName && (
                    <span className="field-error">{cardErrors.cardholderName}</span>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="cardExpiry">Vencimiento</FieldLabel>
                  <Input
                    id="cardExpiry"
                    name="cardExpiry"
                    type="text"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    placeholder="MM/AA"
                    maxLength={5}
                    required
                  />
                  {cardErrors.cardExpiry && (
                    <span className="field-error">{cardErrors.cardExpiry}</span>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="cardCvv">Código de seguridad (CVV)</FieldLabel>
                  <Input
                    id="cardCvv"
                    name="cardCvv"
                    type="password"
                    inputMode="numeric"
                    value={cardCvv}
                    onChange={(e) => handleCvvChange(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                  {cardErrors.cardCvv && (
                    <span className="field-error">{cardErrors.cardCvv}</span>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="cardDni">DNI del titular</FieldLabel>
                  <Input
                    id="cardDni"
                    name="cardDni"
                    type="text"
                    inputMode="numeric"
                    value={cardDni}
                    onChange={(e) => handleDniChange(e.target.value)}
                    placeholder="Ej. 35123456"
                    maxLength={9}
                    required
                  />
                  {cardErrors.cardDni && (
                    <span className="field-error">{cardErrors.cardDni}</span>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="installments">Cuotas</FieldLabel>
                  <select
                    id="installments"
                    className="select-installments"
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                  >
                    <option value={1}>1 pago de {formatCurrency(subtotal)}</option>
                    <option value={3}>
                      3 cuotas fijas de {formatCurrency(Math.round(subtotal / 3))}
                    </option>
                    <option value={6}>
                      6 cuotas fijas de {formatCurrency(Math.round((subtotal * 1.15) / 6))} ({formatCurrency(Math.round(subtotal * 1.15))} final)
                    </option>
                  </select>
                </Field>
              </div>

              <div className="security-notice-badge">
                <Lock size={15} style={{ color: "var(--store-green)" }} />
                <span>
                  Transacción protegida mediante cifrado SSL de 256 bits. No almacenamos datos sensibles de tu tarjeta.
                </span>
              </div>
            </div>
          )}

          {/* Mercado Pago In-Page Info Box */}
          {paymentMethod === "mercadopago" && (
            <div className="mp-payment-box">
              <div className="mp-box-header">
                <MercadoPagoBadge width={95} height={26} />
                <span className="mp-security-pill">
                  <ShieldCheck size={14} /> Pago 100% Protegido
                </span>
              </div>
              <p className="mp-box-text">
                Al confirmar el pedido, te redirigiremos a la pasarela oficial y encriptada de <strong>Mercado Pago</strong> para pagar directamente a la cuenta de Dietética La Familia con dinero en cuenta, tarjeta de débito o crédito en cuotas.
              </p>
              <div className="mp-brands-row">
                <VisaIcon width={36} height={22} />
                <MastercardIcon width={36} height={22} />
                <NaranjaIcon width={40} height={22} />
                <CabalIcon width={34} height={22} />
                <AmexIcon width={32} height={22} />
                <span className="mp-tag-dinero">Dinero en cuenta</span>
              </div>
            </div>
          )}

          {/* Efectivo / Transferencia Box */}
          {paymentMethod === "coordina" && (
            <div className="coordina-payment-box">
              <div className="coordina-header">
                <Wallet size={18} style={{ color: "var(--store-green)" }} />
                <strong>Pago a coordinar al recibir o retirar</strong>
              </div>
              <p className="muted" style={{ fontSize: "13px", margin: "6px 0 0" }}>
                Podés abonar en efectivo, con tarjeta física en el posnet del local o por transferencia bancaria (Alias/CBU) al retirar en la sucursal de Olavarría o al recibir tu pedido en domicilio.
              </p>
            </div>
          )}
        </section>

        {/* Notas adicionales */}
        <Field>
          <FieldLabel htmlFor="notes">
            Notas o indicaciones <span className="muted">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            maxLength={500}
            placeholder="¿Alguna aclaración sobre el horario, dirección o productos?"
          />
        </Field>

        {/* Botón de Confirmación y Pago */}
        <Button type="submit" size="lg" disabled={pending} className="btn-submit-order">
          {pending ? (
            <>
              <RotateCcw size={16} className="animate-spin" />
              <span>{processingStep || "Procesando…"}</span>
            </>
          ) : paymentMethod === "tarjeta" ? (
            <>
              <span>Pagar {formatCurrency(subtotal)} con tarjeta</span>
              <Lock size={15} />
            </>
          ) : paymentMethod === "mercadopago" ? (
            <>
              <span>Pagar con Mercado Pago</span>
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              <span>Confirmar pedido ({formatCurrency(subtotal)})</span>
              <ArrowRight size={16} />
            </>
          )}
        </Button>

        {result?.key === key && (
          <p
            className={result.error ? "review-result error" : "review-result"}
            role={result.error ? "alert" : "status"}
          >
            {result.message}
          </p>
        )}
      </form>

      {/* Resumen lateral de la compra */}
      <aside className="checkout-summary">
        <h2>Tu selección</h2>
        {lines.map((line) => (
          <div key={line.variantId} className="checkout-summary-line">
            <div>
              <strong>{line.product.name}</strong>
              <p className="muted">
                {line.variant.size} × {line.quantity}
              </p>
            </div>
            <span>{formatCurrency(line.total)}</span>
          </div>
        ))}

        <div className="summary-row">
          <span>Subtotal</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>

        <div className="summary-row muted">
          <span>Entrega</span>
          <span>
            {delivery === "store_pickup"
              ? "Sin cargo (retiro en sucursal)"
              : qualifiesForFreeDelivery
                ? `Sin cargo (compra ≥ ${formatCurrency(siteConfig.freeShippingThreshold)})`
                : `A coordinar (gratis desde ${formatCurrency(siteConfig.freeShippingThreshold)})`}
          </span>
        </div>

        <div className="summary-row muted">
          <span>Medio de cobro</span>
          <span>
            {paymentMethod === "tarjeta"
              ? "Tarjeta online"
              : paymentMethod === "mercadopago"
                ? "Mercado Pago"
                : "A coordinar"}
          </span>
        </div>

        <Link href="/carrito" className="text-link">
          Editar mi carrito
        </Link>
      </aside>
    </div>
  );
}
