import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { products } from "../src/features/catalog/data";
import { filterProducts, startingPrice } from "../src/features/catalog/logic";
import {
  sanitizeCart,
  resolveCart,
  cartSubtotal,
} from "../src/features/cart/logic";
import {
  reviewCart,
  validateOrderSubmission,
} from "../src/features/checkout/review";
import { verifyMercadoPagoWebhookSignature } from "../src/features/checkout/webhook-signature";
import {
  catalogToCsv,
  parseArsPrice,
  parseCsvToCatalog,
  resolveSheetImage,
} from "../src/features/catalog/sheets-parser";
import { formatCurrency } from "../src/lib/format-currency";
const almond = products.find((p) => p.slug === "almendras-naturales")!;
const first = almond.variants[0]!;
const second = almond.variants[1]!;
const line = { productId: almond.id, variantId: first.id, quantity: 2 };
test("all products have unique variants and SKU with integer ARS and stock", () => {
  const variants = products.flatMap((p) => p.variants);
  assert.equal(new Set(variants.map((v) => v.id)).size, variants.length);
  assert.equal(new Set(variants.map((v) => v.sku)).size, variants.length);
  assert.ok(
    variants.every(
      (v) =>
        Number.isSafeInteger(v.price) &&
        v.price > 0 &&
        Number.isSafeInteger(v.stock) &&
        v.stock >= 0,
    ),
  );
});
test("search ignores accents and case", () =>
  assert.equal(
    filterProducts(products, { search: "CHIA" })[0]?.slug,
    "semillas-de-chia",
  ));
test("category, sugar and stock filters combine", () => {
  assert.equal(
    filterProducts(products, {
      category: "cereales-granolas",
      noAddedSugar: true,
    })[0]?.slug,
    "avena-arrollada",
  );
  assert.equal(
    filterProducts(products, {
      category: "especias",
      search: "pimenton dulce",
      inStock: true,
    }).length,
    0,
  );
  assert.equal(filterProducts(products, { search: "xyzxyz" }).length, 0);
});
test("price sorting is numeric, based on available variants", () => {
  const sorted = filterProducts(products, { sort: "precio-asc" });
  assert.ok(
    sorted.every(
      (p, i) => i === 0 || startingPrice(p) >= startingPrice(sorted[i - 1]!),
    ),
  );
});
test("cart preserves separate variants and merges duplicates", () => {
  const lines = sanitizeCart(
    [line, { ...line, variantId: second.id }, line],
    products,
  );
  assert.equal(lines.length, 2);
  assert.equal(lines[0]?.quantity, 4);
  assert.equal(cartSubtotal(resolveCart(lines, products)), 4 * 4500 + 2 * 8200);
});
test("cart rejects corrupt and unavailable data; clamps quantities to stock", () => {
  assert.deepEqual(sanitizeCart({ lines: [line] }, products), []);
  assert.deepEqual(
    sanitizeCart(
      [
        null,
        { ...line, quantity: -1 },
        { ...line, quantity: 1.1 },
        { ...line, variantId: "fake" },
        {
          productId: "nueces-mariposa",
          variantId: "nueces-mariposa-1kg",
          quantity: 1,
        },
      ],
      products,
    ),
    [],
  );
  assert.equal(
    sanitizeCart([{ ...line, quantity: 1000 }], products)[0]?.quantity,
    first.stock,
  );
});
test("server review calculates current prices and never enables payment", () =>
  assert.deepEqual(reviewCart({ items: [line] }, products), {
    subtotal: 9000,
    unitCount: 2,
    paymentAvailable: false,
  }));
test("server rejects manipulated prices, duplicate lines, missing variants and insufficient stock", () => {
  for (const input of [
    { items: [{ ...line, price: 1 }] },
    { items: [line, line] },
    { items: [{ ...line, quantity: 99 }] },
    { items: [{ ...line, variantId: "fake" }] },
    { items: [] },
    { items: [{ ...line, quantity: 0 }] },
  ])
    assert.throws(() => reviewCart(input, products));
});
test("currency follows Argentina formatting", () =>
  assert.equal(formatCurrency(4500), "$ 4.500"));
test("sheets parser handles Argentine price formats, semicolon CSV, variant grouping and Drive images", () => {
  assert.equal(parseArsPrice("$ 4.500"), 4500);
  assert.equal(parseArsPrice("$ 15.200,00"), 15200);
  assert.equal(
    resolveSheetImage(
      "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing",
      "Almendras",
      "frutos-secos",
    ),
    "https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOp",
  );

  const excelCsv = [
    "Nombre;Categoría;Presentación;Precio;Stock;Destacado",
    "Pistachos tostados;Frutos secos;250 g;$ 6.900;12;SI",
    "Pistachos tostados;Frutos secos;500 g;$ 12.800;5;SI",
    "Miel orgánica;Endulzantes naturales;500 g;4800;9;NO",
  ].join("\r\n");

  const parsed = parseCsvToCatalog(excelCsv);
  assert.equal(parsed.products.length, 2);
  assert.equal(parsed.products[0]?.name, "Pistachos tostados");
  assert.equal(parsed.products[0]?.variants.length, 2);
  assert.equal(parsed.products[0]?.variants[0]?.price, 6900);
  assert.equal(parsed.products[0]?.variants[1]?.stock, 5);
  assert.ok(parsed.categories.some((c) => c.id === "endulzantes-naturales"));

  // Roundtrip export -> import preserves all products and variants
  const exported = catalogToCsv(products, []);
  const roundtrip = parseCsvToCatalog(exported);
  assert.equal(roundtrip.products.length, products.length);
});
test("parses and optimizes real store price list CSV (lista de precios dietetica  - Hoja 1.csv)", () => {
  const realCsvPath = path.join(
    process.cwd(),
    "lista de precios dietetica  - Hoja 1.csv",
  );
  if (!fs.existsSync(realCsvPath)) return;
  const csvText = fs.readFileSync(realCsvPath, "utf8");
  const catalog = parseCsvToCatalog(csvText);

  assert.ok(
    catalog.products.length > 1500,
    `Expected > 1500 products, got ${catalog.products.length}`,
  );
  assert.ok(
    catalog.categories.length >= 35,
    `Expected >= 35 categories, got ${catalog.categories.length}`,
  );

  const allVariants = catalog.products.flatMap((p) => p.variants);
  assert.ok(
    allVariants.length > 1800,
    `Expected > 1800 variants, got ${allVariants.length}`,
  );
  assert.equal(
    new Set(allVariants.map((v) => v.id)).size,
    allVariants.length,
  );
  assert.equal(
    new Set(allVariants.map((v) => v.sku)).size,
    allVariants.length,
  );
  assert.ok(
    allVariants.every(
      (v) =>
        Number.isSafeInteger(v.price) &&
        v.price >= 50 &&
        Number.isSafeInteger(v.stock) &&
        v.stock >= 0,
    ),
  );
});
test("order submission validates customer fields, delivery address, payment method and builds item snapshots", () => {
  const draft = validateOrderSubmission(
    {
      paymentMethod: "mercadopago",
      customer: {
        firstName: "Lucía",
        lastName: "Gómez",
        email: "lucia@example.com",
        phone: "1155554444",
        deliveryMethod: "home_delivery",
        address: "Av. Santa Fe 3200 4B",
        city: "Palermo",
        province: "CABA",
        postalCode: "C1425BGH",
      },
      items: [line],
    },
    products,
  );
  assert.equal(draft.items[0]?.unitPrice, 4500);

  // Accepts 4-digit (e.g. 7400) and provincial postal codes (e.g. B7400, B 7400)
  for (const cp of ["7400", "B7400", "B 7400", "C1425BGH"]) {
    const validOrder = validateOrderSubmission(
      {
        paymentMethod: "coordina",
        customer: {
          firstName: "Esteban",
          lastName: "Diaz",
          email: "esteban@example.com",
          phone: "2284123456",
          deliveryMethod: "home_delivery",
          address: "Rivadavia 2581",
          city: "Olavarría",
          province: "Buenos Aires",
          postalCode: cp,
        },
        items: [line],
      },
      products,
    );
    assert.equal(validOrder.customer.postalCode, cp);
  }

  const cardOrder = validateOrderSubmission(
    {
      paymentMethod: "tarjeta",
      cardPayment: {
        brand: "VISA",
        lastFour: "4242",
        installments: 3,
        cardholderName: "Lucía Gómez",
        cardholderDni: "35123456",
      },
      customer: {
        firstName: "Lucía",
        lastName: "Gómez",
        email: "lucia@example.com",
        phone: "1155554444",
        deliveryMethod: "home_delivery",
        address: "Av. Santa Fe 3200 4B",
        city: "Palermo",
        province: "CABA",
        postalCode: "C1425BGH",
      },
      items: [line],
    },
    products,
  );
  assert.equal(cardOrder.paymentMethod, "tarjeta");
  assert.equal(cardOrder.cardPayment?.brand, "VISA");
  assert.equal(cardOrder.cardPayment?.lastFour, "4242");
  assert.equal(cardOrder.cardPayment?.installments, 3);
});
test("Mercado Pago webhook HMAC-SHA256 signature verification accepts valid manifest and rejects tampering", () => {
  const secret = "mp_test_webhook_secret_123";
  const dataId = "987654321";
  const requestId = "req-abc-123";
  const ts = "1728000000";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  assert.equal(
    verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret,
    }),
    true,
  );

  assert.equal(
    verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId: "999999999",
      secret,
    }),
    false,
  );
});
