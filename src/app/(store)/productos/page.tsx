import type { Metadata } from "next";
import Link from "next/link";
import { catalog } from "@/server/catalog";
import { CatalogView } from "@/features/catalog/catalog-view";
export const metadata: Metadata = {
  title: "Productos",
  description:
    "Explorá frutos secos, semillas, cereales y alimentos para tu despensa. Elegí tu medida.",
};
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const str = (key: string) =>
    typeof params[key] === "string" ? params[key] : "";
  const initial = {
    search: str("q"),
    category: str("categoria"),
    inStock: str("disponibles") === "1",
    noAddedSugar: str("sin-azucar") === "1",
    sort: str("orden") || "destacados",
  };
  const [products, categories] = await Promise.all([
    catalog.listProducts(),
    catalog.listCategories(),
  ]);
  return (
    <div className="container page-space">
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <span>Productos</span>
      </nav>
      <div className="page-heading">
        <p className="eyebrow">Lo simple sabe mejor</p>
        <h1>Cosas buenas para tu despensa.</h1>
        <p>
          Encontrá tus favoritos, elegí la medida y hacelos parte de tu día.
        </p>
      </div>
      <CatalogView
        key={JSON.stringify(initial)}
        products={products}
        categories={categories}
        initial={initial}
      />
    </div>
  );
}
