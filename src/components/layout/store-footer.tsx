import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, Truck, Heart } from "lucide-react";
import { siteConfig } from "@/config/site";
import { formatCurrency } from "@/lib/format-currency";

export function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="container footer-grid">
        <div className="footer-brand-col">
          <Link href="/" className="brand brand-la-familia">
            <Image
              src="/images/logo-la-familia-real.png"
              alt={siteConfig.name}
              width={48}
              height={48}
              className="brand-logo-img"
            />
            <div className="brand-text-block">
              <span className="brand-title">{siteConfig.name}</span>
              <span className="brand-subtitle">{siteConfig.subbrand}</span>
            </div>
          </Link>
          <p className="footer-tagline">
            Tiendas de alimentos saludables en Olavarría. Alimentos de verdad para cuidarte todos los días.
          </p>
          <div className="footer-social-links">
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-pill footer-ig"
            >
              <Image
                src="/images/instagram-official.svg"
                alt=""
                width={16}
                height={16}
              />
              <span>@{siteConfig.instagramHandle}</span>
            </a>
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-pill footer-wa"
            >
              <Image
                src="/images/whatsapp-official.svg"
                alt=""
                width={16}
                height={16}
              />
              <span>WhatsApp {siteConfig.whatsappDisplay}</span>
            </a>
          </div>
        </div>

        <div>
          <h2>Sucursales en Olavarría</h2>
          <div className="footer-branch-list">
            <div className="footer-branch-card">
              <div className="branch-header">
                <MapPin size={16} style={{ color: "var(--store-lime)" }} />
                <strong>Sucursal Centro</strong>
              </div>
              <p>Rivadavia 2581 (esq. Cnel. Suárez)</p>
              <span className="branch-meta"><Clock size={13} /> {siteConfig.hours}</span>
            </div>
            <div className="footer-branch-card">
              <div className="branch-header">
                <MapPin size={16} style={{ color: "var(--store-lime)" }} />
                <strong>Sucursal Urquiza</strong>
              </div>
              <p>Av. Urquiza 1315 (esq. Rendón)</p>
              <span className="branch-meta"><Clock size={13} /> {siteConfig.hours}</span>
            </div>
          </div>
        </div>

        <div>
          <h2>Explorá el catálogo</h2>
          <Link href="/productos">Todos los productos</Link>
          <Link href="/productos?categoria=galletitas-cereales-y-pan-sin-tacc">Especial Sin TACC</Link>
          <Link href="/productos?categoria=frutos-secos">Frutos secos y semillas</Link>
          <Link href="/productos?categoria=cereales-y-granolas">Granolas y cereales</Link>
          <Link href="/productos?categoria=cotillon">Repostería y cotillón</Link>
          <Link href="/nosotros">Nuestra historia en Olavarría</Link>
        </div>

        <div>
          <h2>Envíos y compras</h2>
          <div className="footer-shipping-badge">
            <Truck size={18} style={{ color: "var(--store-lime)" }} />
            <div>
              <strong>Envíos a domicilio en Olavarría</strong>
              <p>Sin cargo en compras superiores a {formatCurrency(siteConfig.freeShippingThreshold)}.</p>
            </div>
          </div>
          <Link href="/carrito">Mi carrito</Link>
          <Link href="/informacion">Políticas de envío y retiros</Link>
          <Link href="/informacion#privacidad">Términos y privacidad</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {siteConfig.name} · Olavarría, Buenos Aires · Hecho con <Heart size={13} className="inline text-red-500" fill="currentColor" /> para nuestra comunidad
        </span>
        <Link href="/admin" className="text-link">
          Gestión interna
        </Link>
      </div>
    </footer>
  );
}
