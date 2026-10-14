import "server-only";
import { filterProducts } from "@/features/catalog/logic";
import { getSheetsCatalogSnapshot } from "@/server/sheets";
import type { CatalogRepository, Product } from "@/types/catalog";

export const catalog: CatalogRepository = {
  async listProducts(query) {
    const { products } = await getSheetsCatalogSnapshot();
    return filterProducts(products, query);
  },
  async findBySlug(slug) {
    const { products } = await getSheetsCatalogSnapshot();
    return products.find((p) => p.slug === slug && p.isVisible);
  },
  async listCategories() {
    const { categories } = await getSheetsCatalogSnapshot();
    return categories;
  },
};

export async function listFreshProducts(): Promise<Product[]> {
  const { products } = await getSheetsCatalogSnapshot({ bypassCache: true });
  return products;
}
