import type { CatalogQuery, Product } from "@/types/catalog";
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const isAvailable = (product: Product) =>
  product.variants.some((v) => v.stock > 0);
export function startingPrice(product: Product) {
  const available = product.variants.filter((v) => v.stock > 0);
  return Math.min(
    ...(available.length ? available : product.variants).map((v) => v.price),
  );
}
export function filterProducts(
  products: readonly Product[],
  query: CatalogQuery = {},
) {
  const words = normalizeSearch(query.search ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const result = products.filter(
    (p) =>
      p.isVisible &&
      (!query.category || p.categoryId === query.category) &&
      (!query.inStock || isAvailable(p)) &&
      (!query.noAddedSugar || p.tags.includes("sin-azucar-agregada")) &&
      words.every((word) =>
        normalizeSearch(
          `${p.name} ${p.shortDescription} ${p.ingredients} ${p.categoryId.replaceAll("-", " ")}`,
        ).includes(word),
      ),
  );
  return result.sort((a, b) =>
    query.sort === "precio-asc"
      ? startingPrice(a) - startingPrice(b)
      : query.sort === "precio-desc"
        ? startingPrice(b) - startingPrice(a)
        : query.sort === "nombre"
          ? a.name.localeCompare(b.name, "es-AR")
          : Number(b.featured) - Number(a.featured),
  );
}
