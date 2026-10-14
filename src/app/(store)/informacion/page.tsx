import { siteConfig } from "@/config/site";
import { formatCurrency } from "@/lib/format-currency";

export const metadata = {
  title: "Información de compra",
  description:
    "Información sobre envíos a domicilio, retiro sin cargo en Urquiza 1315 y Rivadavia 2581, medios de pago y políticas de privacidad.",
};

export default function Information() {
  return (
    <div className="container page-space editorial-page">
      <p className="eyebrow">Todo claro, desde el principio</p>
      <h1>Información de compra.</h1>

      <h2>Envíos a domicilio y retiro en sucursal</h2>
      <p>
        Con tu compra igual o superior a{" "}
        <strong>{formatCurrency(siteConfig.freeShippingThreshold)}</strong>, el{" "}
        <strong>envío a domicilio es gratis</strong>. También podés elegir{" "}
        <strong>retiro sin cargo</strong> por cualquiera de nuestras dos
        sucursales en <strong>{siteConfig.addresses[0]}</strong> o{" "}
        <strong>{siteConfig.addresses[1]}</strong>. Apenas tu pedido esté
        preparado te avisamos por WhatsApp (
        <strong>{siteConfig.whatsappDisplay}</strong>) o email.
      </p>

      <h2>Medios de pago</h2>
      <p>
        Aceptamos pagos online a través de{" "}
        <strong>Mercado Pago Checkout Pro</strong> (tarjetas de crédito, débito
        y dinero en cuenta) y también podés optar por abonar mediante{" "}
        <strong>transferencia bancaria o efectivo</strong> al retirar o recibir
        tu pedido. Todos los precios están expresados en pesos argentinos (ARS)
        y se verifican en el servidor al confirmar tu compra.
      </p>

      <h2 id="privacidad">Tu privacidad y seguridad</h2>
      <p>
        Tu carrito se conserva localmente en tu navegador para que no pierdas tu
        selección al recargar la página, y podés vaciarlo en cualquier momento.
        Los datos de contacto e ítems del pedido se utilizan exclusivamente para
        procesar tu compra, actualizar el stock y coordinar la entrega.
      </p>
    </div>
  );
}
