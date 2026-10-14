"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, ShoppingBag } from "lucide-react";
import type { Product } from "@/types/catalog";
import { isAvailable } from "@/features/catalog/logic";
import { useCart } from "@/features/cart/provider";
import { formatCurrency } from "@/lib/format-currency";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const defaultVariant =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(
    defaultVariant?.id ?? "",
  );
  const [justAdded, setJustAdded] = useState(false);
  const cart = useCart((s) => s);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? defaultVariant;

  const activeImageSrc =
    selectedVariant?.image ?? product.images[0]?.src ?? "/images/despensa.svg";
  const activeImageAlt = product.images[0]?.alt ?? product.name;
  const hasMultipleVariants = product.variants.length > 1;
  const productHref = selectedVariant
    ? `/productos/${product.slug}?variante=${encodeURIComponent(selectedVariant.id)}`
    : `/productos/${product.slug}`;

  const inCart = selectedVariant
    ? (cart.lines.find((l) => l.variantId === selectedVariant.id)?.quantity ??
      0)
    : 0;
  const canAdd =
    Boolean(selectedVariant) &&
    cart.hydrated &&
    (selectedVariant?.stock ?? 0) > inCart;

  function handleQuickAdd(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedVariant || !canAdd) return;
    cart.add({
      productId: product.id,
      variantId: selectedVariant.id,
      quantity: 1,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <article className="product-card">
      <Link href={productHref} className="product-card-photo-link">
        <div className="product-photo">
          <Image
            src={activeImageSrc}
            alt={activeImageAlt}
            fill
            priority={priority}
            unoptimized={activeImageSrc.startsWith("http")}
            referrerPolicy="no-referrer"
            sizes="(max-width:600px) 46vw, (max-width:1000px) 30vw, 300px"
          />
          {!isAvailable(product) && (
            <span className="stock-badge">Sin stock</span>
          )}
          {hasMultipleVariants && (
            <span className="variant-count-badge">
              {product.variants.length} tamaños
            </span>
          )}
        </div>
      </Link>

      <div className="product-card-body">
        <Link href={productHref} className="product-card-title-link">
          <h3>{product.name}</h3>
        </Link>
        <p className="muted card-description">{product.shortDescription}</p>

        {hasMultipleVariants ? (
          <div
            className="card-variant-pills"
            role="group"
            aria-label={`Elegir tamaño de ${product.name}`}
          >
            {product.variants.map((v) => {
              const isSelected = v.id === selectedVariant?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`card-variant-pill ${isSelected ? "active" : ""} ${v.stock === 0 ? "out" : ""}`}
                  onClick={() => setSelectedVariantId(v.id)}
                  aria-pressed={isSelected}
                  title={`${v.size} — ${formatCurrency(v.price)}`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        ) : (
          selectedVariant && (
            <p className="sizes">Presentación: {selectedVariant.size}</p>
          )
        )}

        <div className="card-bottom">
          <div className="card-price-block">
            <strong>
              {formatCurrency(selectedVariant?.price ?? 0)}
            </strong>
            {selectedVariant && (
              <span className="card-selected-size">
                / {selectedVariant.size}
              </span>
            )}
          </div>
          <div className="card-actions">
            <button
              type="button"
              className={`card-quick-add ${justAdded ? "added" : ""}`}
              onClick={handleQuickAdd}
              disabled={!canAdd}
              aria-label={
                selectedVariant
                  ? `Agregar ${product.name} (${selectedVariant.size}) al carrito`
                  : `Agregar ${product.name} al carrito`
              }
              title={
                selectedVariant
                  ? `Agregar ${selectedVariant.size} al carrito`
                  : "Agregar al carrito"
              }
            >
              {justAdded ? (
                <Check aria-hidden="true" size={16} />
              ) : (
                <ShoppingBag aria-hidden="true" size={16} />
              )}
            </button>
            <Link
              href={productHref}
              className="card-detail-link"
              aria-label={`Ver detalle de ${product.name}`}
              title="Ver detalle"
            >
              <ArrowUpRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

