import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminAuthenticated } from "@/server/admin-auth";
import {
  getSheetsCatalogSnapshot,
  invalidateCatalogCache,
  saveLocalRuntimeConfig,
} from "@/server/sheets";

const configSchema = z
  .object({
    action: z.enum(["sync", "configure"]),
    sheetIdOrUrl: z.string().trim().max(500).optional(),
    csvUrl: z.string().trim().max(800).optional(),
    appsScriptUrl: z.string().trim().max(800).optional(),
    productsTab: z.string().trim().max(120).optional(),
    ordersTab: z.string().trim().max(120).optional(),
  })
  .strict();

export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  ) {
    return NextResponse.json(
      { error: "Origen no permitido." },
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
    const rawBody = await request.json();
    const parsed = configSchema.parse(rawBody);

    if (parsed.action === "configure") {
      await saveLocalRuntimeConfig({
        ...(parsed.sheetIdOrUrl !== undefined
          ? { sheetIdOrUrl: parsed.sheetIdOrUrl }
          : {}),
        ...(parsed.csvUrl !== undefined ? { csvUrl: parsed.csvUrl } : {}),
        ...(parsed.appsScriptUrl !== undefined
          ? { appsScriptUrl: parsed.appsScriptUrl }
          : {}),
        ...(parsed.productsTab !== undefined
          ? { productsTab: parsed.productsTab }
          : {}),
        ...(parsed.ordersTab !== undefined
          ? { ordersTab: parsed.ordersTab }
          : {}),
      });
    } else {
      invalidateCatalogCache();
    }

    const snapshot = await getSheetsCatalogSnapshot({ bypassCache: true });
    revalidatePath("/", "layout");

    return NextResponse.json(
      {
        ok: snapshot.error === null,
        source: snapshot.source,
        productCount: snapshot.products.length,
        variantCount: snapshot.products.reduce(
          (acc, p) => acc + p.variants.length,
          0,
        ),
        canWriteOrders: snapshot.canWriteOrders,
        lastSyncedAt: snapshot.lastSyncedAt,
        error: snapshot.error,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "No se pudo actualizar la configuración de Google Sheets.",
      },
      { status: 400 },
    );
  }
}
