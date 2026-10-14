import { NextResponse } from "next/server";
import { listFreshProducts } from "@/server/catalog";
import { reviewCart } from "@/features/checkout/review";
export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return NextResponse.json(
      { error: "Origen no permitido." },
      { status: 403 },
    );
  const body = await request.text();
  if (body.length > 20000)
    return NextResponse.json(
      { error: "La selección es demasiado grande." },
      { status: 413 },
    );
  try {
    const result = reviewCart(JSON.parse(body), await listFreshProducts());
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "No pudimos validar la selección. Revisá las cantidades y la disponibilidad del carrito.",
      },
      { status: 400 },
    );
  }
}
