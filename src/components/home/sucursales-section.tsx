import Image from "next/image";
import { MapPin, Clock, Phone, ExternalLink } from "lucide-react";
import { siteConfig } from "@/config/site";

export function SucursalesSection() {
  return (
    <section className="sucursales-section" id="sucursales" aria-labelledby="sucursales-title">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Atención personalizada en Olavarría</p>
            <h2 id="sucursales-title">Nuestras 2 Sucursales</h2>
          </div>
          <a
            href={siteConfig.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Consultar por WhatsApp
          </a>
        </div>

        <div className="sucursales-grid">
          {/* Sucursal Centro */}
          <article className="sucursal-card">
            <div className="sucursal-card-header">
              <div>
                <h3>Sucursal Centro</h3>
                <p className="muted" style={{ fontSize: "13px", marginTop: "2px" }}>
                  Rivadavia y Coronel Suárez
                </p>
              </div>
              <span className="sucursal-badge">Horario Corrido</span>
            </div>

            <div className="sucursal-address">
              <MapPin size={18} style={{ color: "var(--store-lime)" }} className="flex-shrink-0" />
              <span>Rivadavia 2581 (esq. Cnel. Suárez), Olavarría</span>
            </div>

            <div className="sucursal-meta-row">
              <div className="sucursal-meta-item">
                <Clock size={15} />
                <span>Lunes a Sábados · {siteConfig.hours}</span>
              </div>
              <div className="sucursal-meta-item">
                <Phone size={15} />
                <span>WhatsApp: {siteConfig.whatsappDisplay}</span>
              </div>
            </div>

            <div className="sucursal-actions">
              <a
                href={`https://wa.me/5492284322581?text=${encodeURIComponent(
                  "Hola Dietética La Familia! Me contacto para consultar por productos en la Sucursal Centro (Rivadavia 2581)."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sucursal-wa"
              >
                <Image
                  src="/images/whatsapp-official.svg"
                  alt=""
                  width={16}
                  height={16}
                />
                Consultar en Centro
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Rivadavia+2581+Olavarria"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sucursal-map"
              >
                <ExternalLink size={15} />
                Cómo llegar
              </a>
            </div>
          </article>

          {/* Sucursal Urquiza */}
          <article className="sucursal-card">
            <div className="sucursal-card-header">
              <div>
                <h3>Sucursal Urquiza</h3>
                <p className="muted" style={{ fontSize: "13px", marginTop: "2px" }}>
                  Av. Urquiza y Rendón
                </p>
              </div>
              <span className="sucursal-badge">Horario Corrido</span>
            </div>

            <div className="sucursal-address">
              <MapPin size={18} style={{ color: "var(--store-lime)" }} className="flex-shrink-0" />
              <span>Av. Urquiza 1315 (esq. Rendón), Olavarría</span>
            </div>

            <div className="sucursal-meta-row">
              <div className="sucursal-meta-item">
                <Clock size={15} />
                <span>Lunes a Sábados · {siteConfig.hours}</span>
              </div>
              <div className="sucursal-meta-item">
                <Phone size={15} />
                <span>WhatsApp: 2284-638849 / {siteConfig.whatsappDisplay}</span>
              </div>
            </div>

            <div className="sucursal-actions">
              <a
                href={`https://wa.me/5492284638849?text=${encodeURIComponent(
                  "Hola Dietética La Familia! Me contacto para consultar por productos en la Sucursal Urquiza 1315."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sucursal-wa"
              >
                <Image
                  src="/images/whatsapp-official.svg"
                  alt=""
                  width={16}
                  height={16}
                />
                Consultar en Urquiza
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Av+Urquiza+1315+Olavarria"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sucursal-map"
              >
                <ExternalLink size={15} />
                Cómo llegar
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
