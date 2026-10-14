import Link from "next/link";
import Image from "next/image";
import { imagery } from "@/config/imagery";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Nuestra esencia",
  description:
    `Conocé ${siteConfig.name} en Olavarría. Alimentos naturales, frutos secos, semillas, harinas, repostería, cotillón y línea sin TACC en nuestras sucursales de Urquiza 1315 y Rivadavia 2581.`,
};

export default function About() {
  return (
    <div className="container page-space editorial-page">
      <p className="eyebrow">Nuestra esencia</p>
      <h1>Volver a lo simple.</h1>
      <p className="lead">
        Creemos en una despensa que acompañe tu forma de vivir: sin
        complicaciones, con ingredientes nobles que conocés y espacio para
        descubrir algo nuevo cada día.
      </p>
      <Image
        src={imagery.hero}
        width={1200}
        height={650}
        alt="Ingredientes cotidianos en cuencos de cerámica"
      />
      <h2>Tu cocina. Tus tiempos. Tus elecciones.</h2>
      <p>
        En <strong>{siteConfig.name}</strong> seleccionamos más de 2.900
        productos entre frutos secos, cereales, semillas, harinas, legumbres,
        especias, suplementos deportivos, cosmética natural y alimentos sin
        TACC. Elegís la presentación que mejor se adapta a tu consumo —por
        unidad, 100 g, 250 g, 500 g o 1 kg— con precios actualizados en tiempo
        real.
      </p>
      <h2>Nuestras sucursales</h2>
      <p>
        Te esperamos en nuestros locales de{" "}
        <strong>{siteConfig.addresses.join(" y ")}</strong>, o podés hacer tu
        pedido online con envío a domicilio (sin cargo en compras desde $ 20.000)
        y atención personalizada por WhatsApp al{" "}
        <strong>{siteConfig.whatsappDisplay}</strong>.
      </p>
      <Link href="/productos" className="text-link">
        Descubrí el catálogo completo →
      </Link>
    </div>
  );
}
