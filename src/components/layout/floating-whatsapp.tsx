"use client";
import Image from "next/image";
import { siteConfig } from "@/config/site";

export function FloatingWhatsApp() {
  return (
    <aside aria-label="Contacto por WhatsApp" className="floating-wa-wrap">
      <a
        href={siteConfig.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-wa-btn"
        aria-label={`Enviar mensaje de WhatsApp a ${siteConfig.name}`}
      >
        <span className="floating-wa-pulse" aria-hidden="true" />
        <Image
          src="/images/whatsapp-official.svg"
          alt="WhatsApp Oficial"
          width={36}
          height={36}
          className="floating-wa-icon"
        />
        <span className="floating-wa-tooltip">
          ¿Dudas? Chateá con nosotros
        </span>
      </a>
    </aside>
  );
}
