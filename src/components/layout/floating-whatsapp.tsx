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
        <span className="floating-wa-bubble">
          <span className="floating-wa-dot" aria-hidden="true" />
          ¿Dudas? Escribinos
        </span>
        <div className="floating-wa-circle">
          <span className="floating-wa-pulse" aria-hidden="true" />
          <Image
            src="/images/whatsapp-official.svg"
            alt="WhatsApp Oficial"
            width={26}
            height={26}
            className="floating-wa-icon"
          />
        </div>
      </a>
    </aside>
  );
}
