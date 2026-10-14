"use client";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Quantity } from "@/components/quantity";
import { useCart, useCatalog } from "./provider";
import { resolveCart, cartSubtotal } from "./logic";
import { formatCurrency } from "@/lib/format-currency";
import { productImage } from "@/config/imagery";
import { siteConfig } from "@/config/site";

export function CartContent({ drawer = false }: { drawer?: boolean }) {
  const cart = useCart((s) => s);
  const products = useCatalog();
  const lines = resolveCart(cart.lines, products);

  if (!cart.hydrated)
    return (
      <p role="status" className={drawer ? "empty-state drawer-empty" : "empty-state"}>
        Cargando tu carrito…
      </p>
    );

  if (!lines.length)
    return (
      <div className={drawer ? "empty-state drawer-empty" : "empty-state"}>
        <ShoppingBag size={drawer ? 34 : 40} strokeWidth={1.2} style={{ color: "var(--store-green)" }} />
        <h2>{drawer ? "Tu canasto está vacío" : "Tu próxima cosa rica está por acá."}</h2>
        <p className="muted">Todavía no agregaste productos a tu carrito.</p>
        <Button
          render={<Link href="/productos" onClick={() => cart.setOpen(false)} />}
          nativeButton={false}
          onClick={() => cart.setOpen(false)}
        >
          Explorar productos <ArrowRight />
        </Button>
      </div>
    );

  return (
    <div className={drawer ? "cart-content drawer-cart" : "cart-content"}>
      <div className="cart-lines">
        {lines.map((line) => {
          const rawThumbnail =
            line.variant.image ??
            line.product.images[0]?.src ??
            "/images/despensa.svg";
          const thumbnailSrc = productImage(rawThumbnail);

          return (
            <article className="cart-line" key={line.variantId}>
              <Link
                href={`/productos/${line.product.slug}?variante=${encodeURIComponent(line.variant.id)}`}
                onClick={() => cart.setOpen(false)}
                className="cart-thumbnail"
              >
                <Image
                  src={thumbnailSrc}
                  alt={line.product.name}
                  width={80}
                  height={80}
                  unoptimized={thumbnailSrc.startsWith("http")}
                  referrerPolicy="no-referrer"
                />
              </Link>
              <div className="cart-line-info">
                <Link
                  href={`/productos/${line.product.slug}?variante=${encodeURIComponent(line.variant.id)}`}
                  onClick={() => cart.setOpen(false)}
                >
                  {line.product.name}
                </Link>
                <p className="muted">
                  {line.variant.size} · {formatCurrency(line.variant.price)} c/u
                </p>
                <Quantity
                  value={line.quantity}
                  max={Math.min(line.variant.stock, 99)}
                  onChange={(n) => cart.setQuantity(line.variantId, n)}
                  label={`Cantidad de ${line.product.name} ${line.variant.size}`}
                />
              </div>
              <div className="cart-line-end">
                <strong>{formatCurrency(line.total)}</strong>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar ${line.product.name} ${line.variant.size}`}
                  onClick={() => cart.remove(line.variantId)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </article>
          );
        })}
        <div className="cart-clear-wrap">
          <Button variant="ghost" size="sm" onClick={cart.clear} className="btn-clear-cart">
            Vaciar carrito
          </Button>
        </div>
      </div>
      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <strong>{formatCurrency(cartSubtotal(lines))}</strong>
        </div>
        <p className="muted">
          Envío gratis desde {formatCurrency(siteConfig.freeShippingThreshold)} o retiro sin cargo en sucursales de Olavarría.
        </p>
        {cart.storageError && (
          <p role="alert">
            No pudimos guardar el carrito en este navegador. No se conservará al
            recargar.
          </p>
        )}
        <Button
          render={<Link href="/checkout" onClick={() => cart.setOpen(false)} />}
          nativeButton={false}
          size="lg"
          onClick={() => cart.setOpen(false)}
        >
          Continuar al checkout <ArrowRight />
        </Button>
        {drawer && (
          <Link
            className="text-link drawer-full-cart-link"
            href="/carrito"
            onClick={() => cart.setOpen(false)}
          >
            Ver carrito completo
          </Link>
        )}
      </div>
    </div>
  );
}
