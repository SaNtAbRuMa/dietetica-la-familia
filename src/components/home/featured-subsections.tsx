import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface FeaturedSubsection {
  id: string;
  title: string;
  badge: string;
  description: string;
  image: string;
  href: string;
}

const subsections: FeaturedSubsection[] = [
  {
    id: "sin-tacc",
    title: "Línea Sin TACC",
    badge: "100% Libre de Gluten",
    description:
      "Galletitas, cereales, harinas, premezclas y fideos libres de gluten con certificación oficial para celíacos.",
    image: "/images/categories/sin-tacc.webp",
    href: "/productos?categoria=galletitas-cereales-y-pan-sin-tacc",
  },
  {
    id: "frutos-secos",
    title: "Frutos Secos & Semillas",
    badge: "Selección Premium",
    description:
      "Almendras naturales, nueces Chandler mariposa, castañas de cajú, maní y semillas puras por peso o fraccionadas.",
    image: "/images/categories/frutos-secos.webp",
    href: "/productos?categoria=frutos-secos",
  },
  {
    id: "granolas",
    title: "Granolas & Desayunos",
    badge: "Elaboración Natural",
    description:
      "Granolas artesanales horneadas con miel, avenas arrolladas, mix energéticos y cereales crocantes sin azúcar añadida.",
    image: "/images/desayuno.webp",
    href: "/productos?categoria=cereales-y-granolas",
  },
];

export function FeaturedSubsections() {
  return (
    <div className="subsections-grid" role="list">
      {subsections.map((sub) => (
        <article key={sub.id} className="subsection-card" role="listitem">
          <Link href={sub.href} className="subsection-image-link" tabIndex={-1} aria-hidden="true">
            <div className="subsection-photo" style={{ position: "relative" }}>
              <Image
                src={sub.image}
                alt={sub.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="subsection-img"
              />
              <span className="subsection-badge">{sub.badge}</span>
            </div>
          </Link>
          <div className="subsection-body">
            <h3 className="subsection-title">
              <Link href={sub.href}>{sub.title}</Link>
            </h3>
            <p className="subsection-desc">{sub.description}</p>
            <Link href={sub.href} className="subsection-link">
              <span>Explorar sección</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
