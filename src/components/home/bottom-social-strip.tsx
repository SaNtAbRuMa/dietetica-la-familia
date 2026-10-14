import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/config/site";

export function BottomSocialStrip() {
  return (
    <section className="bottom-social-section" aria-label="Contacto y Redes Sociales">
      <div className="container">
        <div className="bottom-social-card">
          <div className="bottom-social-copy">
            <p className="eyebrow">Contacto & Comunidad</p>
            <h2>¿Tenés dudas o querés hacer un pedido?</h2>
            <p className="bottom-social-desc">
              Escribinos por WhatsApp o visitá nuestro Instagram para conocer las novedades, recetas e ingresos semanales en Olavarría.
            </p>
          </div>

          <div className="bottom-social-actions">
            {/* WhatsApp */}
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bottom-social-btn"
            >
              <div className="bottom-social-icon">
                <Image
                  src="/images/whatsapp-official.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </div>
              <div className="bottom-social-info">
                <span className="bottom-social-sub">WhatsApp</span>
                <strong className="bottom-social-main">{siteConfig.whatsappDisplay}</strong>
              </div>
              <ArrowUpRight size={17} className="bottom-social-arrow" />
            </a>

            {/* Instagram */}
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bottom-social-btn"
            >
              <div className="bottom-social-icon">
                <Image
                  src="/images/instagram-official.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </div>
              <div className="bottom-social-info">
                <span className="bottom-social-sub">Instagram</span>
                <strong className="bottom-social-main">@{siteConfig.instagramHandle}</strong>
              </div>
              <ArrowUpRight size={17} className="bottom-social-arrow" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
