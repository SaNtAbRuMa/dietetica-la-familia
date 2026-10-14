import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { listFreshProducts } from "@/server/catalog";
import { validateOrderSubmission } from "@/features/checkout/review";
import {
  recordOrderAndSyncSheet,
  updateStoredOrderStatus,
} from "@/server/sheets";
import {
  createMercadoPagoPreference,
  isMercadoPagoConfigured,
} from "@/server/mercadopago";

export async function POST(request: Request) {
  const originHeader = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (originHeader && originHeader !== requestOrigin) {
    return NextResponse.json(
      { error: "Origen no permitido." },
      { status: 403 },
    );
  }

  const body = await request.text();
  if (body.length > 30000) {
    return NextResponse.json(
      { error: "El pedido es demasiado grande." },
      { status: 413 },
    );
  }

  try {
    const products = await listFreshProducts();
    const draft = validateOrderSubmission(JSON.parse(body), products);
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
    const orderId = `LF-${dateStamp}-${randomSuffix}`;

    const isCard = draft.paymentMethod === "tarjeta";
    const isPaid = isCard;

    let stored = await recordOrderAndSyncSheet({
      id: orderId,
      createdAt: now.toISOString(),
      status: isPaid ? "paid" : "pending",
      paymentStatus: isPaid ? "approved" : "pending",
      paymentMethod: draft.paymentMethod,
      customer: draft.customer,
      items: draft.items,
      subtotal: draft.subtotal,
      unitCount: draft.unitCount,
      ...(isPaid ? { paidAt: now.toISOString() } : {}),
      ...(draft.cardPayment ? { paymentDetails: draft.cardPayment } : {}),
    });

    let checkoutUrl: string | null = null;
    let preferenceId: string | null = null;
    const mpConfigured = isMercadoPagoConfigured();
    const mpPublicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim() || null;

    if (draft.paymentMethod === "mercadopago" && mpConfigured) {
      try {
        const pref = await createMercadoPagoPreference(stored, requestOrigin);
        checkoutUrl = pref.initPoint;
        preferenceId = pref.preferenceId;
        const updated = await updateStoredOrderStatus(stored.id, {
          mpPreferenceId: pref.preferenceId,
          mpInitPoint: pref.initPoint,
        });
        if (updated) {
          stored = updated;
        }
      } catch {
        // Keep the created order even if Mercado Pago API temporarily fails
      }
    }

    revalidatePath("/", "layout");

    return NextResponse.json(
      {
        orderId: stored.id,
        subtotal: stored.subtotal,
        unitCount: stored.unitCount,
        paymentMethod: stored.paymentMethod ?? "coordina",
        paymentStatus: stored.paymentStatus,
        paymentDetails: stored.paymentDetails,
        mpConfigured,
        mpPublicKey,
        preferenceId,
        checkoutUrl,
        syncedToSheet: stored.syncedToSheet,
        stockUpdatedInSheet: stored.stockUpdatedInSheet,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error && !err.message.startsWith("[")
        ? err.message
        : "No pudimos registrar el pedido. Revisá los datos y la disponibilidad del carrito.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
