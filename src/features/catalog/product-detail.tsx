"use client";
import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Quantity } from "@/components/quantity";
import { useCart } from "@/features/cart/provider";
import type { Product } from "@/types/catalog";
import { formatCurrency } from "@/lib/format-currency";
import { siteConfig } from "@/config/site";
export function ProductDetail({
  product,
  category,
  initialVariantId,
}: {
  product: Product;
  category: string;
  initialVariantId?: string | undefined;
}) {
  const matchedInitialVariant = initialVariantId
    ? product.variants.find((v) => v.id === initialVariantId)
    : undefined;
  const defaultVariant =
    matchedInitialVariant ??
    product.variants.find((v) => v.stock > 0) ??
    product.variants[0];

  const [variantId, setVariantId] = useState(defaultVariant?.id);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(() => {
    if (defaultVariant?.image) {
      const idx = product.images.findIndex(
        (img) => img.src === defaultVariant.image,
      );
      if (idx !== -1) return idx;
    }
    return 0;
  });
  const cart = useCart((s) => s);
  const variant = product.variants.find((v) => v.id === variantId);
  const image = product.images[imageIndex] ?? product.images[0];
  if (!variant) return null;
  const inCart =
    cart.lines.find((l) => l.variantId === variant.id)?.quantity ?? 0;
  const remaining = Math.max(0, Math.min(99, variant.stock) - inCart);
  const selectedQuantity = Math.min(quantity, Math.max(1, remaining));
  return (
    <div className="product-detail">
      <div>
        <div className="detail-photo">
          {image && (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              unoptimized={image.src.startsWith("http")}
              referrerPolicy="no-referrer"
              sizes="(max-width:767px) 100vw, 50vw"
            />
          )}
        </div>
        {product.images.length > 1 && (
          <div className="thumbnails">
            {product.images.map((img, i) => (
              <button
                key={img.src}
                onClick={() => setImageIndex(i)}
                aria-label={`Ver imagen ${i + 1}`}
                aria-pressed={imageIndex === i}
              >
                <Image
                  src={img.src}
                  alt=""
                  width={80}
                  height={80}
                  unoptimized={img.src.startsWith("http")}
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-info">
        <p className="eyebrow">{category}</p>
        <h1>{product.name}</h1>
        <p className="detail-description">{product.description}</p>
        <p className="detail-price" aria-live="polite">
          {formatCurrency(variant.price)}
        </p>
        <fieldset className="variant-fieldset">
          <legend>Elegí tu medida</legend>
          <div className="variant-options">
            {product.variants.map((v) => (
              <label
                key={v.id}
                className={v.id === variantId ? "variant selected" : "variant"}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variantId}
                  onChange={() => {
                    setVariantId(v.id);
                    setQuantity(1);
                    if (v.image) {
                      const idx = product.images.findIndex(
                        (img) => img.src === v.image,
                      );
                      if (idx !== -1) setImageIndex(idx);
                    }
                  }}
                />
                <span>{v.size}</span>
                {v.stock === 0 && <small>Sin stock</small>}
              </label>
            ))}
          </div>
        </fieldset>
        <p
          className={`availability ${variant.stock ? "" : "unavailable"}`}
          role="status"
        >
          {variant.stock > 0
            ? `● Disponible · ${variant.stock} unidades`
            : "Sin stock por el momento"}
        </p>
        <div className="purchase-row">
          <Quantity
            value={remaining === 0 ? 0 : selectedQuantity}
            max={remaining}
            onChange={setQuantity}
            label={`Cantidad de ${product.name} ${variant.size}`}
          />
          <Button
            disabled={!cart.hydrated || remaining < 1}
            onClick={() =>
              cart.add({
                productId: product.id,
                variantId: variant.id,
                quantity: selectedQuantity,
              })
            }
          >
            <ShoppingBag />
            {variant.stock === 0
              ? "Sin stock"
              : remaining === 0
                ? "Máximo agregado"
                : "Agregar al carrito"}
          </Button>
        </div>
        {inCart > 0 && (
          <p className="muted">
            Ya tenés {inCart} de esta medida en el carrito.
          </p>
        )}
        <p className="delivery-note">
          <PackageCheck size={20} /> Envío gratis desde {formatCurrency(siteConfig.freeShippingThreshold)} · Retiro en
          Urquiza 1315 o Rivadavia 2581.
        </p>
        <Accordion defaultValue={["ingredientes"]}>
          <AccordionItem value="ingredientes">
            <AccordionTrigger>Ingredientes</AccordionTrigger>
            <AccordionContent>{product.ingredients}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="alergenos">
            <AccordionTrigger>Alérgenos</AccordionTrigger>
            <AccordionContent>{product.allergens}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="conservacion">
            <AccordionTrigger>Conservación y más información</AccordionTrigger>
            <AccordionContent>
              {product.storage}
              <p className="mt-3">SKU: {variant.sku}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
