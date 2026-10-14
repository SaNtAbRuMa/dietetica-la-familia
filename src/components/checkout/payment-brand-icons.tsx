import type { CSSProperties } from "react";
import Image from "next/image";

export type BrandIconProps = {
  width?: number | undefined;
  height?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
};

/**
 * Official Visa Inc. vector badge (2021-present).
 * Sourced from official Wikimedia Commons SVG repository.
 */
export function VisaIcon({ width = 40, height = 25, className = "", style }: BrandIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-white px-1.5 py-0.5 shadow-xs border border-black/10 select-none ${className}`}
      style={{ width, height, minWidth: width, minHeight: height, ...style }}
      title="Visa"
    >
      <Image
        src="/images/payments/visa.svg"
        alt="Visa"
        width={width}
        height={height}
        className="max-h-full max-w-full object-contain"
        unoptimized
      />
    </span>
  );
}

/**
 * Official Mastercard overlapping circles vector badge (2019-present).
 * Sourced from official Wikimedia Commons SVG repository.
 */
export function MastercardIcon({ width = 40, height = 25, className = "", style }: BrandIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-[#18181B] px-1 py-0.5 shadow-xs border border-white/10 select-none ${className}`}
      style={{ width, height, minWidth: width, minHeight: height, ...style }}
      title="Mastercard"
    >
      <Image
        src="/images/payments/mastercard.svg"
        alt="Mastercard"
        width={width}
        height={height}
        className="max-h-full max-w-full object-contain"
        unoptimized
      />
    </span>
  );
}

/**
 * Official American Express box logo vector badge.
 * Sourced from official Wikimedia Commons SVG repository.
 */
export function AmexIcon({ width = 36, height = 25, className = "", style }: BrandIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-[#007BC1] px-1 py-0.5 shadow-xs border border-black/10 select-none ${className}`}
      style={{ width, height, minWidth: width, minHeight: height, ...style }}
      title="American Express"
    >
      <Image
        src="/images/payments/amex.svg"
        alt="American Express"
        width={width}
        height={height}
        className="max-h-full max-w-full object-contain"
        unoptimized
      />
    </span>
  );
}

/**
 * Official Cabal Cooperativa credit/debit card badge.
 * Sourced from official Wikimedia Commons SVG repository.
 */
export function CabalIcon({ width = 36, height = 25, className = "", style }: BrandIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-white px-1 py-0.5 shadow-xs border border-black/10 select-none ${className}`}
      style={{ width, height, minWidth: width, minHeight: height, ...style }}
      title="Cabal"
    >
      <Image
        src="/images/payments/cabal.svg"
        alt="Cabal"
        width={width}
        height={height}
        className="max-h-full max-w-full object-contain"
        unoptimized
      />
    </span>
  );
}

/**
 * Official Naranja X card badge.
 * Sourced from official Wikimedia Commons SVG repository.
 */
export function NaranjaIcon({ width = 45, height = 25, className = "", style }: BrandIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-white px-1 py-0.5 shadow-xs border border-black/10 select-none ${className}`}
      style={{ width, height, minWidth: width, minHeight: height, ...style }}
      title="Tarjeta Naranja X"
    >
      <Image
        src="/images/payments/naranja.svg"
        alt="Naranja X"
        width={width}
        height={height}
        className="max-h-full max-w-full object-contain"
        unoptimized
      />
    </span>
  );
}

/**
 * Official Mercado Pago brand badge.
 * Sourced directly from Mercado Pago CDN (http2.mlstatic.com).
 */
export function MercadoPagoBadge({ width = 95, height = 26, className = "", style }: BrandIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-white px-2 py-0.5 shadow-xs border border-[#009EE3]/30 select-none ${className}`}
      style={{ width, height, minWidth: width, minHeight: height, ...style }}
      title="Mercado Pago Oficial"
    >
      <Image
        src="/images/payments/mercadopago-official.png"
        alt="Mercado Pago"
        width={width}
        height={height}
        className="max-h-full w-auto max-w-full object-contain"
        unoptimized
      />
    </span>
  );
}

export function detectCardBrand(
  cleanNumber: string,
): "visa" | "mastercard" | "amex" | "cabal" | "naranja" | "generic" {
  if (/^4/.test(cleanNumber)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) return "mastercard";
  if (/^3[47]/.test(cleanNumber)) return "amex";
  if (/^(589562|402917|402918|527571|527572|377798|377799)/.test(cleanNumber)) return "naranja";
  if (/^(6042|6043|5896)/.test(cleanNumber)) return "cabal";
  return "generic";
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(" ");
}

export function formatExpiration(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  let month = parseInt(digits.slice(0, 2), 10);
  if (month > 12) month = 12;
  if (month === 0) month = 1;
  const mm = String(month).padStart(2, "0");
  return `${mm}/${digits.slice(2)}`;
}
