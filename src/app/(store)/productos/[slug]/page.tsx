import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { catalog } from "@/server/catalog";
import { siteConfig } from "@/config/site";
import { ProductDetail } from "@/features/catalog/product-detail";
import { ProductCard } from "@/components/product-card";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variante?: string }>;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  const products = await catalog.listProducts();
  return products
    .filter((p) => p.featured)
    .slice(0, 24)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await catalog.findBySlug(slug);
  if (!p) return { title: "Producto no encontrado" };
  const primaryImage = p.images[0]?.src;
  return {
    title: p.name,
    description: p.description,
    openGraph: {
      title: `${p.name} | ${siteConfig.name}`,
      description: p.description,
      type: "website",
      locale: "es_AR",
      ...(primaryImage ? { images: [{ url: primaryImage, alt: p.name }] } : {}),
    },
    ...(siteConfig.url
      ? { alternates: { canonical: `${siteConfig.url}/productos/${p.slug}` } }
      : {}),
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, { variante }] = await Promise.all([params, searchParams]);
  const [p, products, categories] = await Promise.all([
    catalog.findBySlug(slug),
    catalog.listProducts(),
    catalog.listCategories(),
  ]);
  if (!p) notFound();
  const category = categories.find((c) => c.id === p.categoryId);
  const related = products
    .filter((x) => x.id !== p.id)
    .sort(
      (a, b) =>
        Number(b.categoryId === p.categoryId) -
        Number(a.categoryId === p.categoryId),
    )
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.variants[0]?.sku ?? p.id,
    category: category?.name ?? "Dietética Natural",
    image: p.images.map((img) =>
      img.src.startsWith("http") || !siteConfig.url
        ? img.src
        : `${siteConfig.url}${img.src}`,
    ),
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: `${p.name} (${v.size})`,
      priceCurrency: "ARS",
      price: v.price,
      availability:
        v.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(siteConfig.url
        ? { url: `${siteConfig.url}/productos/${p.slug}` }
        : {}),
    })),
  };

  return (
    <div className="container page-space">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <Link href="/productos">Productos</Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <ProductDetail
        product={p}
        category={category?.name ?? ""}
        initialVariantId={variante}
      />
      <section className="section">
        <div className="section-heading">
          <h2>También pueden gustarte.</h2>
          <Link href="/productos" className="text-link">
            Ver todo
          </Link>
        </div>
        <div className="product-grid featured-grid">
          {related.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
