import "server-only";
import type { StoredOrder } from "@/server/sheets";

export type MercadoPagoPreferenceResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
};

export type MercadoPagoPaymentInfo = {
  id: string;
  status:
    | "approved"
    | "pending"
    | "authorized"
    | "in_process"
    | "in_mediation"
    | "rejected"
    | "cancelled"
    | "refunded"
    | "charged_back";
  statusDetail: string;
  externalReference: string | null;
  transactionAmount: number;
  currencyId: string;
};

export function getMercadoPagoAccessToken(): string {
  return (
    process.env.MP_ACCESS_TOKEN?.trim() ||
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ||
    ""
  );
}

export function isMercadoPagoConfigured(): boolean {
  return getMercadoPagoAccessToken().length > 0;
}

/**
 * Creates a Mercado Pago Checkout Pro preference strictly on the server
 * using verified order snapshot prices and items.
 */
export async function createMercadoPagoPreference(
  order: Pick<
    StoredOrder,
    "id" | "customer" | "items" | "subtotal"
  >,
  originUrl: string,
): Promise<MercadoPagoPreferenceResult> {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no está configurado en el servidor.");
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || originUrl).replace(
    /\/+$/,
    "",
  );
  const returnBase = `${baseUrl}/checkout/retorno?orderId=${encodeURIComponent(order.id)}`;
  const isHttps = baseUrl.startsWith("https://");

  const payload: Record<string, unknown> = {
    external_reference: order.id,
    statement_descriptor: "DIET LA FAMILIA",
    items: order.items.map((item) => ({
      id: item.variantId,
      title: `${item.productName} (${item.variantSize})`,
      description: `SKU ${item.sku} · ${item.variantSize}`,
      category_id: "food",
      quantity: item.quantity,
      currency_id: "ARS",
      unit_price: item.unitPrice,
    })),
    payer: {
      name: order.customer.firstName,
      surname: order.customer.lastName,
      email: order.customer.email,
      phone: {
        number: order.customer.phone,
      },
      ...(order.customer.address
        ? {
            address: {
              street_name: order.customer.address,
              zip_code: order.customer.postalCode ?? "",
            },
          }
        : {}),
    },
    back_urls: {
      success: `${returnBase}&resultado=exito`,
      pending: `${returnBase}&resultado=pendiente`,
      failure: `${returnBase}&resultado=error`,
    },
    ...(isHttps
      ? {
          auto_return: "approved",
          notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        }
      : {}),
    metadata: {
      order_id: order.id,
      delivery_method: order.customer.deliveryMethod,
      subtotal_ars: order.subtotal,
    },
  };

  const response = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `pref-${order.id}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `No se pudo crear la preferencia de Mercado Pago (${response.status}): ${errText.slice(0, 180)}`,
    );
  }

  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("id" in data) ||
    typeof data.id !== "string" ||
    !("init_point" in data) ||
    typeof data.init_point !== "string"
  ) {
    throw new Error("Respuesta inválida al crear la preferencia de Mercado Pago.");
  }

  const sandboxInitPoint =
    "sandbox_init_point" in data && typeof data.sandbox_init_point === "string"
      ? data.sandbox_init_point
      : undefined;

  return {
    preferenceId: data.id,
    initPoint: data.init_point,
    ...(sandboxInitPoint ? { sandboxInitPoint } : {}),
  };
}

export { verifyMercadoPagoWebhookSignature } from "@/features/checkout/webhook-signature";

/**
 * Queries Mercado Pago's REST API directly from the server to obtain the
 * authoritative payment status before mutating any order state.
 */
export async function fetchMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPaymentInfo> {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no está configurado en el servidor.");
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Error al consultar pago ${paymentId} en Mercado Pago (${response.status}).`,
    );
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("status" in data)) {
    throw new Error("Respuesta de pago inválida desde Mercado Pago.");
  }

  const record = data as Record<string, unknown>;
  const id = String(record.id ?? paymentId);
  const status = String(
    record.status ?? "pending",
  ) as MercadoPagoPaymentInfo["status"];
  const statusDetail =
    typeof record.status_detail === "string" ? record.status_detail : "";
  const externalReference =
    typeof record.external_reference === "string"
      ? record.external_reference
      : null;
  const transactionAmount =
    typeof record.transaction_amount === "number"
      ? record.transaction_amount
      : Number(record.transaction_amount ?? 0);
  const currencyId =
    typeof record.currency_id === "string" ? record.currency_id : "ARS";

  return {
    id,
    status,
    statusDetail,
    externalReference,
    transactionAmount,
    currencyId,
  };
}
