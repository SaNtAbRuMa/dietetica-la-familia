import type { Product, ProductVariant } from "@/types/catalog";
import type { CartLine } from "./types";
export type ResolvedCartLine = CartLine & {
  product: Product;
  variant: ProductVariant;
  total: number;
};
export function sanitizeCart(
  input: unknown,
  products: readonly Product[],
): CartLine[] {
  if (!Array.isArray(input)) return [];
  const result: CartLine[] = [];
  for (const raw of input.slice(0, 100)) {
    if (
      !raw ||
      typeof raw !== "object" ||
      !("productId" in raw) ||
      !("variantId" in raw) ||
      !("quantity" in raw) ||
      typeof raw.quantity !== "number" ||
      !Number.isSafeInteger(raw.quantity) ||
      raw.quantity < 1
    )
      continue;
    const product = products.find((p) => p.id === raw.productId && p.isVisible);
    const variant = product?.variants.find(
      (v) => v.id === raw.variantId && v.stock > 0,
    );
    if (!product || !variant) continue;
    const existing = result.find((line) => line.variantId === variant.id);
    const quantity = Math.min(
      (existing?.quantity ?? 0) + raw.quantity,
      variant.stock,
      99,
    );
    if (existing) existing.quantity = quantity;
    else
      result.push({ productId: product.id, variantId: variant.id, quantity });
  }
  return result;
}
export function resolveCart(
  lines: readonly CartLine[],
  products: readonly Product[],
): ResolvedCartLine[] {
  return lines.flatMap((line) => {
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    return product && variant
      ? [{ ...line, product, variant, total: variant.price * line.quantity }]
      : [];
  });
}
export const cartSubtotal = (lines: readonly ResolvedCartLine[]) =>
  lines.reduce((sum, line) => sum + line.total, 0);
