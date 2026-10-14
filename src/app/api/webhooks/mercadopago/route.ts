import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  fetchMercadoPagoPayment,
  isMercadoPagoConfigured,
  verifyMercadoPagoWebhookSignature,
} from "@/server/mercadopago";
import {
  findStoredOrderById,
  updateStoredOrderStatus,
} from "@/server/sheets";

function extractNotificationPaymentId(
  url: URL,
  body: unknown,
): { type: string; dataId: string } {
  const queryDataId =
    url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  const queryType =
    url.searchParams.get("type") || url.searchParams.get("topic") || "";

  if (!body || typeof body !== "object") {
    return { type: queryType, dataId: queryDataId };
  }

  const record = body as Record<string, unknown>;
  const bodyType =
    typeof record.type === "string"
      ? record.type
      : typeof record.topic === "string"
        ? record.topic
        : queryType;

  let bodyDataId = queryDataId;
  if (
    record.data &&
    typeof record.data === "object" &&
    "id" in record.data &&
    (typeof record.data.id === "string" || typeof record.data.id === "number")
  ) {
    bodyDataId = String(record.data.id);
  } else if (
    !bodyDataId &&
    (typeof record.id === "string" || typeof record.id === "number")
  ) {
    bodyDataId = String(record.id);
  }

  return { type: bodyType, dataId: bodyDataId };
}

export async function POST(request: Request) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Mercado Pago no configurado." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  let parsedBody: unknown = null;
  try {
    const rawText = await request.text();
    if (rawText) {
      parsedBody = JSON.parse(rawText);
    }
  } catch {
    // Ignore malformed JSON body if query params exist
  }

  const { type, dataId } = extractNotificationPaymentId(url, parsedBody);

  // Acknowledge non-payment notifications with 200 OK so Mercado Pago doesn't retry
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  const validSignature = verifyMercadoPagoWebhookSignature({
    xSignature,
    xRequestId,
    dataId,
  });

  if (!validSignature) {
    return NextResponse.json(
      { ok: false, error: "Firma de webhook inválida." },
      { status: 401 },
    );
  }

  try {
    const payment = await fetchMercadoPagoPayment(dataId);
    if (!payment.externalReference) {
      return NextResponse.json({ ok: true, matched: false });
    }

    const order = await findStoredOrderById(payment.externalReference);
    if (!order) {
      return NextResponse.json({ ok: true, matched: false });
    }

    if (
      payment.status === "approved" &&
      payment.currencyId === "ARS" &&
      Math.round(payment.transactionAmount) >= order.subtotal
    ) {
      await updateStoredOrderStatus(order.id, {
        status: "paid",
        paymentStatus: "approved",
        mpPaymentId: payment.id,
        paidAt: new Date().toISOString(),
      });
      revalidatePath("/admin");
      revalidatePath("/checkout/retorno");
    } else if (
      payment.status === "rejected" ||
      payment.status === "cancelled" ||
      payment.status === "charged_back"
    ) {
      await updateStoredOrderStatus(order.id, {
        paymentStatus: "rejected",
        mpPaymentId: payment.id,
      });
      revalidatePath("/admin");
      revalidatePath("/checkout/retorno");
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      paymentStatus: payment.status,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo verificar el pago." },
      { status: 500 },
    );
  }
}
