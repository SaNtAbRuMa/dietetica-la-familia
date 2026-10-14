import { z } from "zod";
import type { Product } from "@/types/catalog";
export const reviewSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.string().min(1).max(120),
            variantId: z.string().min(1).max(160),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type ReviewResult = {
  subtotal: number;
  unitCount: number;
  paymentAvailable: false;
};
export function reviewCart(
  input: unknown,
  products: readonly Product[],
): ReviewResult {
  const { items } = reviewSchema.parse(input);
  const seen = new Set<string>();
  let subtotal = 0;
  let unitCount = 0;
  for (const item of items) {
    if (seen.has(item.variantId))
      throw new Error("Hay variantes repetidas. Revisá el carrito.");
    seen.add(item.variantId);
    const p = products.find((p) => p.id === item.productId && p.isVisible);
    const v = p?.variants.find((v) => v.id === item.variantId);
    if (!v || v.stock < item.quantity)
      throw new Error(
        "Cambió la disponibilidad de un producto. Revisá el carrito.",
      );
    subtotal += v.price * item.quantity;
    unitCount += item.quantity;
  }
  return { subtotal, unitCount, paymentAvailable: false };
}

const postalCodeRegex = /^([0-9]{4}|[A-Za-z]\s*[0-9]{4}(\s*[A-Za-z]{3})?)$/;

export const orderSubmissionSchema = z
  .object({
    customer: z
      .object({
        firstName: z.string().trim().min(2).max(120),
        lastName: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(120),
        phone: z.string().trim().min(6).max(60),
        deliveryMethod: z.enum(["home_delivery", "store_pickup"]),
        address: z.string().trim().max(200).optional(),
        city: z.string().trim().max(100).optional(),
        province: z.string().trim().max(100).optional(),
        postalCode: z.string().trim().max(12).optional(),
        pickupBranch: z.enum(["centro", "urquiza"]).optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .strict()
      .superRefine((customer, ctx) => {
        if (customer.deliveryMethod === "home_delivery") {
          if (!customer.address || customer.address.length < 5) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["address"],
              message: "Ingresá la dirección de entrega.",
            });
          }
          if (!customer.city || customer.city.length < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["city"],
              message: "Ingresá la localidad.",
            });
          }
          if (!customer.province || customer.province.length < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["province"],
              message: "Ingresá la provincia.",
            });
          }
          if (
            !customer.postalCode ||
            !postalCodeRegex.test(customer.postalCode)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["postalCode"],
              message: "Ingresá un código postal válido de Argentina.",
            });
          }
        }
      }),
    items: reviewSchema.shape.items,
    paymentMethod: z.enum(["mercadopago", "tarjeta", "coordina"]).optional(),
    cardPayment: z
      .object({
        brand: z.string().max(40).optional(),
        lastFour: z.string().max(4).optional(),
        installments: z.number().int().min(1).max(24).optional(),
        cardholderName: z.string().max(100).optional(),
        cardholderDni: z.string().max(20).optional(),
      })
      .optional(),
  })
  .strict();

export type ValidatedOrderDraft = {
  paymentMethod: "mercadopago" | "tarjeta" | "coordina";
  cardPayment?:
    | {
        brand?: string | undefined;
        lastFour?: string | undefined;
        installments?: number | undefined;
        cardholderName?: string | undefined;
        cardholderDni?: string | undefined;
      }
    | undefined;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    deliveryMethod: "home_delivery" | "store_pickup";
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    pickupBranch?: "centro" | "urquiza";
    notes?: string;
  };
  items: {
    productId: string;
    productName: string;
    variantId: string;
    variantSize: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  unitCount: number;
};

export function validateOrderSubmission(
  input: unknown,
  products: readonly Product[],
): ValidatedOrderDraft {
  const { customer, items, paymentMethod, cardPayment } =
    orderSubmissionSchema.parse(input);
  const seen = new Set<string>();
  const resolvedItems: ValidatedOrderDraft["items"] = [];
  let subtotal = 0;
  let unitCount = 0;

  for (const item of items) {
    if (seen.has(item.variantId)) {
      throw new Error("Hay variantes repetidas. Revisá el carrito.");
    }
    seen.add(item.variantId);

    const product = products.find(
      (p) => p.id === item.productId && p.isVisible,
    );
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant || variant.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para ${product?.name ?? "un producto"} (${variant?.size ?? ""}). Disponible: ${variant?.stock ?? 0}.`,
      );
    }

    const lineTotal = variant.price * item.quantity;
    subtotal += lineTotal;
    unitCount += item.quantity;

    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantSize: variant.size,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice: variant.price,
      lineTotal,
    });
  }

  return {
    paymentMethod: paymentMethod ?? "coordina",
    ...(cardPayment ? { cardPayment } : {}),
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      deliveryMethod: customer.deliveryMethod,
      ...(customer.address ? { address: customer.address } : {}),
      ...(customer.city ? { city: customer.city } : {}),
      ...(customer.province ? { province: customer.province } : {}),
      ...(customer.postalCode ? { postalCode: customer.postalCode } : {}),
      ...(customer.notes ? { notes: customer.notes } : {}),
    },
    items: resolvedItems,
    subtotal,
    unitCount,
  };
}
