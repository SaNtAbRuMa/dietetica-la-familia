import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Scale, Wheat, PackageCheck, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { catalog } from "@/server/catalog";
import { imagery } from "@/config/imagery";
import { siteConfig } from "@/config/site";
import { FeaturedSubsections } from "@/components/home/featured-subsections";
import { BottomSocialStrip } from "@/components/home/bottom-social-strip";
import { SucursalesSection } from "@/components/home/sucursales-section";

export default async function Home() {
  const [products, categories] = await Promise.all([
    catalog.listProducts(),
    catalog.listCategories(),
  ]);
  const seenFeaturedImages = new Set<string>();
  const featuredProducts = products
    .filter((p) => {
      if (!p.featured) return false;
      const src = p.images[0]?.src ?? "";
      if (!src.startsWith("http")) return false;
      if (seenFeaturedImages.has(src)) return false;
      seenFeaturedImages.add(src);
      return true;
    })
    .slice(0, 8);
  const homeFeatured =
    featuredProducts.length >= 4
      ? featuredProducts
      : products.filter((p) => p.featured).slice(0, 8);

  const secondaryCategories = categories.filter(
    (c) =>
      !["frutos-secos", "galletitas-cereales-y-pan-sin-tacc", "cereales-y-granolas"].includes(
        c.id
      )
  );

  return (
    <>
      {/* Hero Section with Dietética La Familia Brand Identity */}
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-pill">
            <MapPin size={13} />
            <span>2 Sucursales en Olavarría</span>
          </div>
          <h1>
            Alimentación saludable,
            <br />
            <span className="hero-title-accent">en familia.</span>
          </h1>
          <p className="hero-description">
            Dietética, Herboristería, Repostería y Cotillón. Más de 2.900 opciones
            naturales, frutos secos, harinas y especialidades sin TACC para tu cocina
            de todos los días en Olavarría.
          </p>
          <div className="hero-actions-row">
            <Button
              render={<Link href="/productos" />}
              nativeButton={false}
              size="lg"
            >
              Explorar productos <ArrowRight />
            </Button>
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-btn-wa"
            >
              <Image
                src="/images/whatsapp-official.svg"
                alt=""
                width={18}
                height={18}
              />
              Pedir por WhatsApp
            </a>
          </div>
          <div className="hero-badges-row">
            <span className="hero-badge-item">
              <CheckCircle2 size={15} /> Horario corrido
            </span>
            <span className="hero-badge-item">
              <CheckCircle2 size={15} /> Envío gratis desde $ 20.000
            </span>
            <span className="hero-badge-item">
              <CheckCircle2 size={15} /> Retiro sin cargo
            </span>
          </div>
        </div>
        <div className="hero-image">
          <Image
            src={imagery.hero}
            alt="Dietética La Familia - Alimentos saludables y frutos secos en Olavarría"
            fill
            priority
            sizes="(max-width:767px) 100vw, 55vw"
          />
        </div>
      </section>

      {/* Featured Categories & Subsections */}
      <section className="section container" id="categorias">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Categorías destacadas</p>
            <h2>Especialidades de la despensa.</h2>
          </div>
          <Link href="/productos" className="text-link">
            Ver catálogo completo <ArrowRight size={16} />
          </Link>
        </div>

        {/* The 3 main sub-sections requested: Sin TACC, Frutos Secos, Granolas */}
        <FeaturedSubsections />

        {/* Secondary Category Pills */}
        {secondaryCategories.length > 0 && (
          <div className="other-categories-bar">
            <span className="other-categories-label">Más secciones:</span>
            <div className="other-categories-pills">
              {secondaryCategories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/productos?categoria=${cat.id}`}
                  className="other-category-pill"
                >
                  {cat.name}
                </Link>
              ))}
              <Link href="/productos" className="other-category-pill other-category-pill-all">
                Ver todas ({categories.length}) →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Infaltables de todos los días</p>
            <h2>Esos que siempre volvés a elegir.</h2>
          </div>
          <Link href="/productos" className="text-link">
            Explorar productos <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid featured-grid">
          {homeFeatured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Discovery Section */}
      <section className="container discovery">
        <div className="discovery-photo">
          <Image
            src={imagery.breakfast}
            alt="Un desayuno con granola y fruta fresca"
            fill
            sizes="(max-width:767px) 100vw, 50vw"
          />
        </div>
        <div className="discovery-copy">
          <p className="eyebrow">Las mañanas tienen otro sabor</p>
          <h2>
            Un pequeño ritual.
            <br />
            Un gran comienzo.
          </h2>
          <p>
            Granolas, avenas y semillas para hacer de cada mañana tu momento
            favorito.
          </p>
          <Link
            className="text-link"
            href="/productos?q=granola"
          >
            Armá tu desayuno <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="container benefits" aria-label="A tu manera">
        {[
          {
            Icon: Scale,
            title: "Elegí tu medida",
            text: "Distintos tamaños y presentaciones por unidad, 100 g, 500 g o 1 kg.",
          },
          {
            Icon: Wheat,
            title: "Más de 2.900 productos",
            text: "Frutos secos, semillas, harinas, suplementos, legumbres y línea sin TACC.",
          },
          {
            Icon: PackageCheck,
            title: "Envío o retiro en sucursal",
            text: "Envío a domicilio gratis desde $ 20.000 o retiro sin cargo en Urquiza 1315 y Rivadavia 2581.",
          },
        ].map(({ Icon, title, text }) => (
          <div key={title}>
            <Icon size={28} strokeWidth={1.3} />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      {/* Nuestras 2 Sucursales en Olavarría */}
      <SucursalesSection />

      {/* Contacto Oficial y Redes al pie */}
      <BottomSocialStrip />
    </>
  );
}
