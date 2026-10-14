import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { formatCurrency } from "@/lib/format-currency";
import { ClearCartOnMount } from "@/features/checkout/clear-cart-on-mount";
import {
  findStoredOrderById,
  updateStoredOrderStatus,
} from "@/server/sheets";
import {
  fetchMercadoPagoPayment,
  isMercadoPagoConfigured,
} from "@/server/mercadopago";

export const metadata: Metadata = {
  title: "Estado de tu pedido",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const val = params[key];
  return typeof val === "string" ? val.trim() : "";
}

export default async function CheckoutReturnPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderId =
    firstParam(params, "orderId") || firstParam(params, "external_reference");
  const paymentId =
    firstParam(params, "payment_id") || firstParam(params, "collection_id");
  const returnHint =
    firstParam(params, "resultado") || firstParam(params, "status");

  let order = orderId ? await findStoredOrderById(orderId) : undefined;

  // Never trust URL query status alone. Only update payment status if verified server-to-server against Mercado Pago API.
  if (
    order &&
    order.paymentStatus !== "approved" &&
    paymentId &&
    paymentId !== "null" &&
    isMercadoPagoConfigured()
  ) {
    try {
      const verified = await fetchMercadoPagoPayment(paymentId);
      if (
        verified.externalReference === order.id &&
        verified.status === "approved" &&
        verified.currencyId === "ARS" &&
        Math.round(verified.transactionAmount) >= order.subtotal
      ) {
        const updated = await updateStoredOrderStatus(order.id, {
          status: "paid",
          paymentStatus: "approved",
          mpPaymentId: verified.id,
          paidAt: new Date().toISOString(),
        });
        if (updated) {
          order = updated;
        }
      }
    } catch {
      // Rely on async webhook notification if immediate lookup fails
    }
  }

  if (!order) {
    return (
      <div className="container page-space">
        <div className="empty-state" role="status">
          <AlertCircle size={36} />
          <h1>No encontramos el pedido consultado</h1>
          <p className="muted">
            Verificá el número de pedido o escribinos por WhatsApp al{" "}
            <strong>{siteConfig.whatsappDisplay}</strong> para asistirte.
          </p>
          <Button render={<Link href="/productos" />} nativeButton={false}>
            Volver al catálogo
            <ArrowRight />
          </Button>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "approved";
  const isRejected =
    order.paymentStatus === "rejected" || returnHint === "error" || returnHint === "rejected";

  const itemLinesText = order.items
    .map(
      (item) =>
        `- ${item.quantity}x ${item.productName} (${item.variantSize}): ${formatCurrency(item.lineTotal)}`,
    )
    .join("\n");

  const whatsappText = [
    `Hola! Consulto por mi pedido #${order.id}:`,
    itemLinesText,
    `Total: ${formatCurrency(order.subtotal)}`,
    `Estado de pago: ${isPaid ? "Acreditado (Mercado Pago)" : "Pendiente de confirmación"}`,
    `Entrega: ${
      order.customer.deliveryMethod === "home_delivery"
        ? `Envío a domicilio (${order.customer.address ?? ""})`
        : "Retiro en sucursal (Urquiza 1315 / Rivadavia 2581)"
    }`,
    `Cliente: ${order.customer.firstName} ${order.customer.lastName}`,
  ].join("\n");

  const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
    whatsappText,
  )}`;

  return (
    <div className="container page-space">
      <ClearCartOnMount />
      <div className="checkout-grid">
        <div className="empty-state" role="status" aria-live="polite">
          {isPaid ? (
            <CheckCircle2 size={40} />
          ) : isRejected ? (
            <AlertCircle size={40} />
          ) : (
            <Clock size={40} />
          )}

          <h1>
            {isPaid
              ? `¡Pago acreditado, ${order.customer.firstName}!`
              : isRejected
                ? `Tu pedido #${order.id} quedó registrado`
                : `¡Recibimos tu pedido, ${order.customer.firstName}!`}
          </h1>

          <p>
            Pedido <strong>#{order.id}</strong> por{" "}
            <strong>{formatCurrency(order.subtotal)}</strong> (
            {order.unitCount}{" "}
            {order.unitCount === 1 ? "unidad" : "unidades"}).
          </p>

          <p className="muted">
            {isPaid
              ? "Mercado Pago confirmó la acreditación de tu pago. Ya estamos preparando tu pedido."
              : isRejected
                ? "El pago en Mercado Pago no pudo completarse, pero reservamos tu pedido para que puedas reintentar el pago o coordinarlo por WhatsApp."
                : "Tu pedido está registrado. El estado se actualizará a Pagado automáticamente apenas Mercado Pago confirme la acreditación mediante notificación al servidor."}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            {!isPaid && order.mpInitPoint ? (
              <Button
                render={
                  <a
                    href={order.mpInitPoint}
                    rel="noopener noreferrer"
                  />
                }
                nativeButton={false}
              >
                Pagar con Mercado Pago
                <ExternalLink size={16} />
              </Button>
            ) : null}

            <Button
              variant={!isPaid && order.mpInitPoint ? "outline" : "default"}
              render={
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              nativeButton={false}
            >
              Enviar detalle por WhatsApp ({siteConfig.whatsappDisplay})
              <ArrowRight />
            </Button>

            <Button
              variant="outline"
              render={<Link href="/productos" />}
              nativeButton={false}
            >
              Seguir recorriendo la tienda
            </Button>
          </div>
        </div>

        <aside className="checkout-summary">
          <h2>Resumen del pedido #{order.id}</h2>
          {order.items.map((item) => (
            <div key={item.variantId} className="checkout-summary-line">
              <div>
                <strong>{item.productName}</strong>
                <p className="muted">
                  {item.variantSize} × {item.quantity}
                </p>
              </div>
              <span>{formatCurrency(item.lineTotal)}</span>
            </div>
          ))}
          <div className="summary-row">
            <span>Total</span>
            <strong>{formatCurrency(order.subtotal)}</strong>
          </div>
          <div className="summary-row muted">
            <span>Estado del pago</span>
            <span>
              {isPaid
                ? "Pagado (verificado)"
                : isRejected
                  ? "Rechazado / A coordinar"
                  : "Pendiente de acreditación"}
            </span>
          </div>
          <div className="summary-row muted">
            <span>Entrega</span>
            <span>
              {order.customer.deliveryMethod === "store_pickup"
                ? "Retiro en local (Urquiza 1315 / Rivadavia 2581)"
                : "Envío a domicilio"}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
