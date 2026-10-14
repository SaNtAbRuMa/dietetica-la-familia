import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminAuthenticated } from "@/server/admin-auth";
import { updateStoredOrderStatus } from "@/server/sheets";

const updateOrderSchema = z
  .object({
    orderId: z.string().trim().min(1).max(80),
    status: z
      .enum(["pending", "paid", "preparing", "ready", "shipped", "cancelled"])
      .optional(),
    paymentStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const originHeader = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (originHeader && originHeader !== requestOrigin) {
    return NextResponse.json(
      { ok: false, error: "Origen no permitido." },
      { status: 403 },
    );
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "Sesión de administrador requerida." },
      { status: 401 },
    );
  }

  try {
    const rawBody: unknown = await request.json();
    const parsed = updateOrderSchema.parse(rawBody);

    const updated = await updateStoredOrderStatus(parsed.orderId, {
      ...(parsed.status ? { status: parsed.status } : {}),
      ...(parsed.paymentStatus ? { paymentStatus: parsed.paymentStatus } : {}),
      ...(parsed.paymentStatus === "approved"
        ? { paidAt: new Date().toISOString() }
        : {}),
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Pedido no encontrado." },
        { status: 404 },
      );
    }

    revalidatePath("/admin");
    revalidatePath("/checkout/retorno");

    return NextResponse.json({ ok: true, order: updated });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "No se pudo actualizar el estado del pedido.",
      },
      { status: 400 },
    );
  }
}
