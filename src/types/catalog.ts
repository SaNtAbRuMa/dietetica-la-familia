export type ProductVariant = {
  id: string;
  sku: string;
  size: string;
  price: number;
  stock: number;
  image?: string | undefined;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  isVisible: boolean;
  variants: readonly ProductVariant[];
  shortDescription: string;
  ingredients: string;
  allergens: string;
  storage: string;
  images: readonly { src: string; alt: string }[];
  tags: readonly string[];
  featured: boolean;
};

export type Category = {
  id: string;
  name: string;
  image: string;
  description: string;
};
export type CatalogQuery = {
  search?: string;
  category?: string;
  inStock?: boolean;
  noAddedSugar?: boolean;
  sort?: string;
};

export interface CatalogRepository {
  listProducts(query?: CatalogQuery): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | undefined>;
  listCategories(): Promise<Category[]>;
}
