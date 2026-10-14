import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminAuthenticated } from "@/server/admin-auth";
import {
  adminToggleProduct,
  adminUpdateVariant,
  adminUpsertCategory,
  adminUpsertProduct,
} from "@/server/sheets";

const updateVariantSchema = z
  .object({
    action: z.literal("update_variant"),
    productId: z.string().trim().min(1).max(160),
    variantId: z.string().trim().min(1).max(200),
    price: z.number().int().min(1).max(50_000_000).optional(),
    stock: z.number().int().min(0).max(100_000).optional(),
    size: z.string().trim().min(1).max(80).optional(),
    sku: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

const toggleProductSchema = z
  .object({
    action: z.literal("toggle_product"),
    productId: z.string().trim().min(1).max(160),
    isVisible: z.boolean().optional(),
    featured: z.boolean().optional(),
  })
  .strict();

const upsertProductSchema = z
  .object({
    action: z.literal("upsert_product"),
    id: z.string().trim().max(160).optional(),
    name: z.string().trim().min(2).max(200),
    categoryId: z.string().trim().min(1).max(120),
    shortDescription: z.string().trim().max(300).optional(),
    description: z.string().trim().max(1000).optional(),
    ingredients: z.string().trim().max(500).optional(),
    image: z.string().trim().max(1000).optional(),
    isVisible: z.boolean().optional(),
    featured: z.boolean().optional(),
    noAddedSugar: z.boolean().optional(),
    variants: z
      .array(
        z
          .object({
            id: z.string().trim().max(200).optional(),
            sku: z.string().trim().max(80).optional(),
            size: z.string().trim().min(1).max(80),
            price: z.number().int().min(1).max(50_000_000),
            stock: z.number().int().min(0).max(100_000),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();

const upsertCategorySchema = z
  .object({
    action: z.literal("upsert_category"),
    id: z.string().trim().max(120).optional(),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(300).optional(),
    image: z.string().trim().max(500).optional(),
  })
  .strict();

const catalogActionSchema = z.discriminatedUnion("action", [
  updateVariantSchema,
  toggleProductSchema,
  upsertProductSchema,
  upsertCategorySchema,
]);

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
    const parsed = catalogActionSchema.parse(rawBody);

    if (parsed.action === "update_variant") {
      const product = await adminUpdateVariant({
        productId: parsed.productId,
        variantId: parsed.variantId,
        ...(parsed.price !== undefined ? { price: parsed.price } : {}),
        ...(parsed.stock !== undefined ? { stock: parsed.stock } : {}),
        ...(parsed.size !== undefined ? { size: parsed.size } : {}),
        ...(parsed.sku !== undefined ? { sku: parsed.sku } : {}),
      });
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, product });
    }

    if (parsed.action === "toggle_product") {
      const product = await adminToggleProduct({
        productId: parsed.productId,
        ...(parsed.isVisible !== undefined
          ? { isVisible: parsed.isVisible }
          : {}),
        ...(parsed.featured !== undefined ? { featured: parsed.featured } : {}),
      });
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, product });
    }

    if (parsed.action === "upsert_product") {
      const product = await adminUpsertProduct({
        ...(parsed.id ? { id: parsed.id } : {}),
        name: parsed.name,
        categoryId: parsed.categoryId,
        ...(parsed.shortDescription
          ? { shortDescription: parsed.shortDescription }
          : {}),
        ...(parsed.description ? { description: parsed.description } : {}),
        ...(parsed.ingredients ? { ingredients: parsed.ingredients } : {}),
        ...(parsed.image ? { image: parsed.image } : {}),
        ...(parsed.isVisible !== undefined
          ? { isVisible: parsed.isVisible }
          : {}),
        ...(parsed.featured !== undefined ? { featured: parsed.featured } : {}),
        ...(parsed.noAddedSugar !== undefined
          ? { noAddedSugar: parsed.noAddedSugar }
          : {}),
        variants: parsed.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          ...(v.sku ? { sku: v.sku } : {}),
          size: v.size,
          price: v.price,
          stock: v.stock,
        })),
      });
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, product });
    }

    const category = await adminUpsertCategory({
      ...(parsed.id ? { id: parsed.id } : {}),
      name: parsed.name,
      ...(parsed.description ? { description: parsed.description } : {}),
      ...(parsed.image ? { image: parsed.image } : {}),
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, category });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "No se pudo guardar el cambio en el catálogo.",
      },
      { status: 400 },
    );
  }
}
