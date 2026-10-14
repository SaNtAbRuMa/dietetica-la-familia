import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Category, Product, ProductVariant } from "@/types/catalog";
import {
  products as fallbackProducts,
  categories as fallbackCategories,
} from "@/features/catalog/data";
import {
  catalogToCsv,
  matrixToCatalog,
  normalizeHeader,
  parseArsPrice,
  parseCsvToCatalog,
  parseStock,
  resolveSheetImage,
  slugify,
} from "@/features/catalog/sheets-parser";

export type SheetsConnectionMode =
  | "google_sheets_api"
  | "google_apps_script"
  | "google_sheets_csv"
  | "local_csv_file"
  | "local_fallback";

export type SheetsCatalogSnapshot = {
  products: Product[];
  categories: Category[];
  source: SheetsConnectionMode;
  sheetId: string | null;
  productsTab: string;
  ordersTab: string;
  canWriteOrders: boolean;
  lastSyncedAt: string | null;
  error: string | null;
};

export type StoredOrderLine = {
  productId: string;
  productName: string;
  variantId: string;
  variantSize: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type StoredOrder = {
  id: string;
  createdAt: string;
  status: "pending" | "paid" | "preparing" | "ready" | "shipped" | "cancelled";
  paymentStatus: "pending" | "approved" | "rejected";
  paymentMethod?: "mercadopago" | "tarjeta" | "coordina" | undefined;
  paymentDetails?:
    | {
        brand?: string | undefined;
        lastFour?: string | undefined;
        installments?: number | undefined;
        cardholderName?: string | undefined;
        cardholderDni?: string | undefined;
      }
    | undefined;
  mpPreferenceId?: string | undefined;
  mpInitPoint?: string | undefined;
  mpPaymentId?: string | undefined;
  paidAt?: string | undefined;
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
  items: StoredOrderLine[];
  subtotal: number;
  unitCount: number;
  syncedToSheet: boolean;
  stockUpdatedInSheet: boolean;
};

type LocalRuntimeConfig = {
  sheetIdOrUrl?: string;
  csvUrl?: string;
  appsScriptUrl?: string;
  productsTab?: string;
  ordersTab?: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(DATA_DIR, "sheets-config.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

let memoryCatalogCache: {
  snapshot: SheetsCatalogSnapshot;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 15_000; // 15 seconds in-memory TTL for instant updates

export function extractSpreadsheetId(input: string | undefined): {
  sheetId: string | null;
  gid: string | null;
} {
  if (!input) return { sheetId: null, gid: null };
  const trimmed = input.trim();
  if (!trimmed) return { sheetId: null, gid: null };

  // If this is a published web link (/spreadsheets/d/e/2PACX-.../pub...), it's a direct web CSV URL, not a sheet ID
  if (trimmed.includes("/spreadsheets/d/e/") || trimmed.includes("/pub")) {
    const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
    return {
      sheetId: null,
      gid: gidMatch?.[1] ?? null,
    };
  }

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,80})/);
  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
  if (urlMatch?.[1]) {
    return {
      sheetId: urlMatch[1],
      gid: gidMatch?.[1] ?? null,
    };
  }

  // Raw ID (alphanumeric, hyphens, underscores, typically 25-60 chars)
  if (/^[a-zA-Z0-9-_]{15,80}$/.test(trimmed)) {
    return { sheetId: trimmed, gid: null };
  }

  return { sheetId: null, gid: null };
}

export async function readLocalRuntimeConfig(): Promise<LocalRuntimeConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as LocalRuntimeConfig;
    }
  } catch {
    // Ignore if file does not exist yet
  }
  return {};
}

export async function saveLocalRuntimeConfig(
  config: LocalRuntimeConfig,
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  invalidateCatalogCache();
}

export function invalidateCatalogCache(): void {
  memoryCatalogCache = null;
}

export async function resolveSheetsConfig() {
  const local = await readLocalRuntimeConfig();
  const rawSheet =
    process.env.GOOGLE_SHEET_ID?.trim() || local.sheetIdOrUrl?.trim() || "";
  const { sheetId, gid } = extractSpreadsheetId(rawSheet);

  let csvUrl =
    process.env.GOOGLE_SHEET_CSV_URL?.trim() || local.csvUrl?.trim() || "";

  // Automatically detect if rawSheet is itself a published CSV web URL
  if (
    !csvUrl &&
    rawSheet.startsWith("http") &&
    (rawSheet.includes("output=csv") ||
      rawSheet.includes("/pub") ||
      rawSheet.includes("/d/e/"))
  ) {
    csvUrl = rawSheet;
  }

  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL?.trim() ||
    local.appsScriptUrl?.trim() ||
    "";
  const productsTab =
    process.env.GOOGLE_SHEET_PRODUCTS_TAB?.trim() ||
    local.productsTab?.trim() ||
    "Productos";
  const ordersTab =
    process.env.GOOGLE_SHEET_ORDERS_TAB?.trim() ||
    local.ordersTab?.trim() ||
    "Pedidos";
  const serviceAccountEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "")
    .replace(/\\n/g, "\n")
    .trim();

  const hasServiceAccount = Boolean(
    sheetId && serviceAccountEmail && privateKey.includes("PRIVATE KEY"),
  );
  const hasAppsScript = Boolean(
    appsScriptUrl && appsScriptUrl.startsWith("https://script.google.com/"),
  );
  const hasCsvOrSheetId = Boolean(csvUrl || sheetId);

  return {
    rawSheet,
    sheetId,
    gid,
    csvUrl,
    appsScriptUrl,
    productsTab,
    ordersTab,
    serviceAccountEmail,
    privateKey,
    hasServiceAccount,
    hasAppsScript,
    hasCsvOrSheetId,
    canWriteOrders: hasServiceAccount || hasAppsScript,
  };
}

async function getServiceAccountAccessToken(
  clientEmail: string,
  privateKey: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  ).toString("base64url");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  signer.end();
  const signature = signer.sign(privateKey, "base64url");
  const assertion = `${header}.${claim}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo autenticar la Service Account de Google (${response.status}).`,
    );
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Respuesta de OAuth2 sin access_token.");
  }
  return data.access_token;
}

async function fetchViaServiceAccount(
  sheetId: string,
  productsTab: string,
  clientEmail: string,
  privateKey: string,
): Promise<{ products: Product[]; categories: Category[] }> {
  const token = await getServiceAccountAccessToken(clientEmail, privateKey);
  const encodedRange = encodeURIComponent(productsTab);
  let response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  // If the tab isn't named "Productos", fallback to the first sheet range "A1:Z1000"
  if (!response.ok && response.status === 400) {
    response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z1000`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
  }

  if (!response.ok) {
    throw new Error(
      `Google Sheets API devolvió estado ${response.status}. Verificá que la hoja esté compartida con ${clientEmail}.`,
    );
  }

  const body = (await response.json()) as { values?: string[][] };
  if (!body.values || body.values.length < 2) {
    throw new Error("La hoja de cálculo no contiene filas de productos.");
  }

  return matrixToCatalog(body.values, fallbackCategories);
}

async function fetchViaAppsScript(
  appsScriptUrl: string,
): Promise<{ products: Product[]; categories: Category[] }> {
  const response = await fetch(appsScriptUrl, {
    method: "GET",
    headers: { Accept: "application/json, text/csv" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `El Web App de Google Apps Script respondió con estado ${response.status}.`,
    );
  }

  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as {
      rows?: string[][];
      error?: string;
    };
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    if (Array.isArray(parsed.rows)) {
      return matrixToCatalog(parsed.rows, fallbackCategories);
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Fallback if the script returned CSV
      return parseCsvToCatalog(text, fallbackCategories);
    }
    throw err;
  }

  throw new Error("Formato de respuesta no reconocido desde Apps Script.");
}

async function fetchViaPublicCsv(
  sheetId: string | null,
  gid: string | null,
  productsTab: string,
  csvUrl: string,
): Promise<{ products: Product[]; categories: Category[] }> {
  const candidateUrls: string[] = [];

  if (csvUrl) {
    candidateUrls.push(csvUrl);
  }

  if (sheetId) {
    if (gid) {
      candidateUrls.push(
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
      );
    }
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(productsTab)}`,
    );
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
    );
  }

  let lastError = "No se configuró ningún enlace o ID de Google Sheet.";

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
      });

      if (!response.ok) {
        lastError = `Google Sheets respondió con estado ${response.status}. Asegurate de que el archivo tenga acceso "Cualquier persona con el enlace puede leer" o esté publicado en la web.`;
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const text = await response.text();

      // If Google redirected to the HTML sign-in page, the sheet is private
      if (
        contentType.includes("text/html") ||
        text.trimStart().startsWith("<!DOCTYPE html") ||
        text.trimStart().startsWith("<html")
      ) {
        lastError =
          'El Google Sheet es privado. En Google Sheets hacé clic en "Compartir" -> "Cualquier persona con el enlace (Lector)" o usá el conector de Apps Script / Service Account.';
        continue;
      }

      const catalog = parseCsvToCatalog(text, fallbackCategories);
      if (catalog.products.length > 0) {
        return catalog;
      }
      lastError =
        "Se leyó la hoja pero no se encontraron filas con las columnas Producto y Precio_ARS.";
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.message
          : "Error de red al conectar con Google Sheets.";
    }
  }

  throw new Error(lastError);
}

const LOCAL_CSV_CANDIDATES = [
  "catalogo-dietetica-optimizado.csv",
  "lista de precios dietetica  - Hoja 1.csv",
];

async function readLocalCsvCatalog(): Promise<{
  products: Product[];
  categories: Category[];
  fileName: string;
} | null> {
  for (const fileName of LOCAL_CSV_CANDIDATES) {
    try {
      const fullPath = path.join(process.cwd(), fileName);
      const raw = await fs.readFile(fullPath, "utf8");
      const parsed = parseCsvToCatalog(raw, fallbackCategories);
      if (parsed.products.length > 0) {
        return { ...parsed, fileName };
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

async function enrichProductsWithImageCache(
  products: Product[],
): Promise<Product[]> {
  try {
    const cachePath = path.join(process.cwd(), ".data", "imagenes-cache.json");
    const raw = await fs.readFile(cachePath, "utf8");
    const cache = JSON.parse(raw) as Record<string, { url: string }>;

    return products.map((p) => {
      const pKey = p.name.toLowerCase().trim();
      let firstVariantImg: string | undefined = undefined;

      const updatedVariants = p.variants.map((v) => {
        if (!v.image || !v.image.startsWith("http")) {
          const vKey1 = `${p.name} ${v.size}`.toLowerCase().trim();
          const found = cache[vKey1]?.url || cache[pKey]?.url;
          if (found && found.startsWith("http")) {
            if (!firstVariantImg) firstVariantImg = found;
            return { ...v, image: found };
          }
        }
        if (!firstVariantImg && v.image && v.image.startsWith("http")) {
          firstVariantImg = v.image;
        }
        return v;
      });

      const hasPrimaryImg = p.images.some(
        (img) => img.src && img.src.startsWith("http"),
      );
      const updatedImages = hasPrimaryImg
        ? p.images
        : firstVariantImg
          ? [{ src: firstVariantImg, alt: p.name }, ...p.images]
          : p.images;

      return {
        ...p,
        variants: updatedVariants,
        images: updatedImages,
      };
    });
  } catch {
    return products;
  }
}

/**
 * Fetches the live catalog from Google Sheets (or uploaded local CSV file, with fallback to seed data).
 */
export async function getSheetsCatalogSnapshot(options?: {
  bypassCache?: boolean;
}): Promise<SheetsCatalogSnapshot> {
  const now = Date.now();
  if (
    !options?.bypassCache &&
    memoryCatalogCache &&
    memoryCatalogCache.expiresAt > now
  ) {
    return memoryCatalogCache.snapshot;
  }

  const config = await resolveSheetsConfig();

  if (
    !config.hasServiceAccount &&
    !config.hasAppsScript &&
    !config.hasCsvOrSheetId
  ) {
    const localCsv = await readLocalCsvCatalog();
    if (localCsv) {
      const snapshot: SheetsCatalogSnapshot = {
        products: localCsv.products,
        categories: localCsv.categories,
        source: "local_csv_file",
        sheetId: localCsv.fileName,
        productsTab: config.productsTab,
        ordersTab: config.ordersTab,
        canWriteOrders: true,
        lastSyncedAt: new Date().toISOString(),
        error: null,
      };
      memoryCatalogCache = {
        snapshot,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return snapshot;
    }

    return {
      products: fallbackProducts,
      categories: fallbackCategories,
      source: "local_fallback",
      sheetId: null,
      productsTab: config.productsTab,
      ordersTab: config.ordersTab,
      canWriteOrders: false,
      lastSyncedAt: null,
      error: null,
    };
  }

  try {
    let result: { products: Product[]; categories: Category[] };
    let source: SheetsConnectionMode;

    if (config.hasServiceAccount && config.sheetId) {
      result = await fetchViaServiceAccount(
        config.sheetId,
        config.productsTab,
        config.serviceAccountEmail,
        config.privateKey,
      );
      source = "google_sheets_api";
    } else if (config.hasAppsScript) {
      result = await fetchViaAppsScript(config.appsScriptUrl);
      source = "google_apps_script";
    } else {
      result = await fetchViaPublicCsv(
        config.sheetId,
        config.gid,
        config.productsTab,
        config.csvUrl,
      );
      source = "google_sheets_csv";
    }

    if (result.products.length === 0) {
      throw new Error(
        "El Google Sheet no devolvió ningún producto válido. Verificá las columnas Producto y Precio_ARS.",
      );
    }

    result.products = await enrichProductsWithImageCache(result.products);

    const snapshot: SheetsCatalogSnapshot = {
      products: result.products,
      categories: result.categories,
      source,
      sheetId: config.sheetId,
      productsTab: config.productsTab,
      ordersTab: config.ordersTab,
      canWriteOrders: config.canWriteOrders,
      lastSyncedAt: new Date().toISOString(),
      error: null,
    };

    memoryCatalogCache = {
      snapshot,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return snapshot;
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Error desconocido al leer Google Sheets.";

    // If we had a previously valid Google Sheets snapshot in memory, serve its products while reporting the warning
    if (
      memoryCatalogCache &&
      memoryCatalogCache.snapshot.source !== "local_fallback"
    ) {
      return {
        ...memoryCatalogCache.snapshot,
        error: errorMessage,
      };
    }

    return {
      products: fallbackProducts,
      categories: fallbackCategories,
      source: "local_fallback",
      sheetId: config.sheetId,
      productsTab: config.productsTab,
      ordersTab: config.ordersTab,
      canWriteOrders: config.canWriteOrders,
      lastSyncedAt: null,
      error: errorMessage,
    };
  }
}

function columnNumberToLetter(colIndexZeroBased: number): string {
  let temp = colIndexZeroBased + 1;
  let letter = "";
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

async function syncOrderViaServiceAccount(
  order: StoredOrder,
  sheetId: string,
  productsTab: string,
  ordersTab: string,
  clientEmail: string,
  privateKey: string,
): Promise<{ syncedToSheet: boolean; stockUpdatedInSheet: boolean }> {
  const token = await getServiceAccountAccessToken(clientEmail, privateKey);

  // 1. Append order row to Orders tab
  const itemsSummary = order.items
    .map(
      (i) =>
        `${i.quantity}x ${i.productName} (${i.variantSize}) [${i.sku}] - $ ${i.lineTotal}`,
    )
    .join(" | ");

  const addressSummary =
    order.customer.deliveryMethod === "home_delivery"
      ? `${order.customer.address ?? ""}, ${order.customer.city ?? ""}, ${order.customer.province ?? ""} (CP ${order.customer.postalCode ?? ""})`
      : "Retiro en local";

  const orderRow = [
    order.id,
    new Date(order.createdAt).toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
    }),
    order.status,
    order.paymentStatus,
    `${order.customer.firstName} ${order.customer.lastName}`,
    order.customer.email,
    order.customer.phone,
    order.customer.deliveryMethod === "home_delivery"
      ? "Envío a domicilio"
      : "Retiro en local",
    addressSummary,
    itemsSummary,
    order.subtotal,
    order.customer.notes ?? "",
  ];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(ordersTab)}!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [orderRow] }),
      cache: "no-store",
    },
  );

  const syncedToSheet = appendRes.ok;

  // 2. Read Products tab to locate rows and decrement stock
  let stockUpdatedInSheet = false;
  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(productsTab)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (readRes.ok) {
    const body = (await readRes.json()) as { values?: string[][] };
    const rows = body.values ?? [];
    const headers = (rows[0] ?? []).map(normalizeHeader);

    const skuCol = headers.findIndex((h) =>
      ["sku", "codigo", "cod", "id_variante", "codigo_sku"].includes(h),
    );
    const nameCol = headers.findIndex((h) =>
      ["producto", "nombre", "titulo", "articulo", "name"].includes(h),
    );
    const sizeCol = headers.findIndex((h) =>
      ["presentacion", "medida", "tamano", "peso", "variante", "size"].includes(
        h,
      ),
    );
    const stockCol = headers.findIndex((h) =>
      ["stock", "cantidad", "disponible", "unidades", "existencia"].includes(h),
    );
    const priceCol = headers.findIndex((h) =>
      ["precio", "precio_ars", "precio_venta", "valor", "price"].includes(h),
    );

    if (stockCol !== -1) {
      const stockColLetter = columnNumberToLetter(stockCol);
      const updates: { range: string; values: number[][] }[] = [];

      for (const item of order.items) {
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;

          const rowSku = skuCol !== -1 ? row[skuCol]?.trim() : undefined;
          const rowName = nameCol !== -1 ? row[nameCol]?.trim() : undefined;
          const rowSize =
            sizeCol !== -1 ? (row[sizeCol]?.trim() ?? "Unidad") : "Unidad";
          const rowPrice =
            priceCol !== -1 ? parseArsPrice(row[priceCol]) : null;

          const matchesBySku = Boolean(rowSku && rowSku === item.sku);
          const matchesByNameAndSize = Boolean(
            rowName &&
              slugify(rowName) === item.productId &&
              slugify(rowSize) === slugify(item.variantSize) &&
              rowPrice !== null,
          );

          if (matchesBySku || matchesByNameAndSize) {
            const currentStock = parseStock(row[stockCol]);
            const nextStock = Math.max(0, currentStock - item.quantity);
            updates.push({
              range: `${productsTab}!${stockColLetter}${r + 1}`,
              values: [[nextStock]],
            });
            break;
          }
        }
      }

      if (updates.length > 0) {
        const batchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              valueInputOption: "USER_ENTERED",
              data: updates,
            }),
            cache: "no-store",
          },
        );
        stockUpdatedInSheet = batchRes.ok;
      }
    }
  }

  return { syncedToSheet, stockUpdatedInSheet };
}

async function syncOrderViaAppsScript(
  order: StoredOrder,
  appsScriptUrl: string,
): Promise<{ syncedToSheet: boolean; stockUpdatedInSheet: boolean }> {
  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create_order",
      order,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return { syncedToSheet: false, stockUpdatedInSheet: false };
  }

  try {
    const data = (await response.json()) as {
      ok?: boolean;
      stockUpdated?: boolean;
    };
    return {
      syncedToSheet: Boolean(data.ok),
      stockUpdatedInSheet: Boolean(data.stockUpdated),
    };
  } catch {
    return { syncedToSheet: true, stockUpdatedInSheet: true };
  }
}

export async function listStoredOrders(): Promise<StoredOrder[]> {
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as StoredOrder[];
    }
  } catch {
    // Ignore if file does not exist
  }
  return [];
}

export async function findStoredOrderById(
  orderId: string,
): Promise<StoredOrder | undefined> {
  if (!orderId) return undefined;
  const orders = await listStoredOrders();
  return orders.find((o) => o.id === orderId);
}

export async function updateStoredOrderStatus(
  orderId: string,
  patch: Partial<
    Pick<
      StoredOrder,
      | "status"
      | "paymentStatus"
      | "mpPreferenceId"
      | "mpInitPoint"
      | "mpPaymentId"
      | "paidAt"
    >
  >,
): Promise<StoredOrder | null> {
  const existing = await listStoredOrders();
  const idx = existing.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;

  const current = existing[idx];
  if (!current) return null;

  const updated: StoredOrder = {
    ...current,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.paymentStatus ? { paymentStatus: patch.paymentStatus } : {}),
    ...(patch.mpPreferenceId ? { mpPreferenceId: patch.mpPreferenceId } : {}),
    ...(patch.mpInitPoint ? { mpInitPoint: patch.mpInitPoint } : {}),
    ...(patch.mpPaymentId ? { mpPaymentId: patch.mpPaymentId } : {}),
    ...(patch.paidAt ? { paidAt: patch.paidAt } : {}),
  };

  existing[idx] = updated;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      ORDERS_FILE,
      JSON.stringify(existing, null, 2),
      "utf8",
    );
  } catch {
    // Ignore filesystem errors in read-only serverless environments
  }

  // Also notify Google Apps Script if configured so the "Pedidos" sheet reflects the status change
  try {
    const config = await resolveSheetsConfig();
    if (config.hasAppsScript) {
      await fetch(config.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_order_status",
          orderId: updated.id,
          status: updated.status,
          paymentStatus: updated.paymentStatus,
          mpPaymentId: updated.mpPaymentId ?? "",
        }),
        cache: "no-store",
      });
    }
  } catch {
    // Non-fatal
  }

  return updated;
}

async function persistCatalogSnapshot(
  products: readonly Product[],
  categories: readonly Category[],
): Promise<boolean> {
  try {
    const outputPath = path.join(
      process.cwd(),
      "catalogo-dietetica-optimizado.csv",
    );
    const csvContent = "\uFEFF" + catalogToCsv(products, categories);
    await fs.writeFile(outputPath, csvContent, "utf8");
    invalidateCatalogCache();
    return true;
  } catch {
    invalidateCatalogCache();
    return false;
  }
}

/**
 * Records a verified order locally and syncs it to Google Sheets (appending to "Pedidos" + deducting stock in "Productos").
 */
export async function recordOrderAndSyncSheet(
  order: Omit<StoredOrder, "syncedToSheet" | "stockUpdatedInSheet">,
): Promise<StoredOrder> {
  const config = await resolveSheetsConfig();
  let syncedToSheet = false;
  let stockUpdatedInSheet = false;

  try {
    if (config.hasServiceAccount && config.sheetId) {
      const res = await syncOrderViaServiceAccount(
        { ...order, syncedToSheet: false, stockUpdatedInSheet: false },
        config.sheetId,
        config.productsTab,
        config.ordersTab,
        config.serviceAccountEmail,
        config.privateKey,
      );
      syncedToSheet = res.syncedToSheet;
      stockUpdatedInSheet = res.stockUpdatedInSheet;
    } else if (config.hasAppsScript) {
      const res = await syncOrderViaAppsScript(
        { ...order, syncedToSheet: false, stockUpdatedInSheet: false },
        config.appsScriptUrl,
      );
      syncedToSheet = res.syncedToSheet;
      stockUpdatedInSheet = res.stockUpdatedInSheet;
    } else {
      // Deduct stock directly in the optimized local CSV catalog when running in local CSV mode
      const current = await getSheetsCatalogSnapshot({ bypassCache: true });
      if (current.source === "local_csv_file") {
        const qtyByVariant = new Map<string, number>();
        for (const item of order.items) {
          qtyByVariant.set(
            item.variantId,
            (qtyByVariant.get(item.variantId) ?? 0) + item.quantity,
          );
        }
        const updatedProducts = current.products.map((p) => ({
          ...p,
          variants: p.variants.map((v) => {
            const deduct = qtyByVariant.get(v.id);
            if (!deduct) return v;
            return { ...v, stock: Math.max(0, v.stock - deduct) };
          }),
        }));
        stockUpdatedInSheet = await persistCatalogSnapshot(
          updatedProducts,
          current.categories,
        );
        syncedToSheet = stockUpdatedInSheet;
      }
    }
  } catch {
    // Keep local order even if remote sheet write failed
  }

  const stored: StoredOrder = {
    ...order,
    syncedToSheet,
    stockUpdatedInSheet,
  };

  try {
    const existing = await listStoredOrders();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      ORDERS_FILE,
      JSON.stringify([stored, ...existing].slice(0, 500), null, 2),
      "utf8",
    );
  } catch {
    // In read-only serverless filesystems without /tmp, ignore local file write error
  }

  invalidateCatalogCache();
  return stored;
}

export async function adminUpdateVariant(input: {
  productId: string;
  variantId: string;
  price?: number;
  stock?: number;
  size?: string;
  sku?: string;
}): Promise<Product> {
  const snapshot = await getSheetsCatalogSnapshot({ bypassCache: true });
  const productIndex = snapshot.products.findIndex(
    (p) => p.id === input.productId,
  );
  if (productIndex === -1) {
    throw new Error("Producto no encontrado.");
  }

  const target = snapshot.products[productIndex]!;
  let variantFound = false;
  const updatedVariants: ProductVariant[] = target.variants.map((v) => {
    if (v.id !== input.variantId) return v;
    variantFound = true;
    return {
      ...v,
      ...(input.price !== undefined
        ? { price: Math.max(1, Math.round(input.price)) }
        : {}),
      ...(input.stock !== undefined
        ? { stock: Math.max(0, Math.round(input.stock)) }
        : {}),
      ...(input.size ? { size: input.size.trim() } : {}),
      ...(input.sku ? { sku: input.sku.trim() } : {}),
    };
  });

  if (!variantFound) {
    throw new Error("Variante no encontrada.");
  }

  const updatedProduct: Product = {
    ...target,
    variants: updatedVariants,
  };

  const nextProducts = [...snapshot.products];
  nextProducts[productIndex] = updatedProduct;

  await persistCatalogSnapshot(nextProducts, snapshot.categories);
  return updatedProduct;
}

export async function adminToggleProduct(input: {
  productId: string;
  isVisible?: boolean;
  featured?: boolean;
}): Promise<Product> {
  const snapshot = await getSheetsCatalogSnapshot({ bypassCache: true });
  const productIndex = snapshot.products.findIndex(
    (p) => p.id === input.productId,
  );
  if (productIndex === -1) {
    throw new Error("Producto no encontrado.");
  }

  const target = snapshot.products[productIndex]!;
  const updatedProduct: Product = {
    ...target,
    ...(input.isVisible !== undefined ? { isVisible: input.isVisible } : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
  };

  const nextProducts = [...snapshot.products];
  nextProducts[productIndex] = updatedProduct;

  await persistCatalogSnapshot(nextProducts, snapshot.categories);
  return updatedProduct;
}

export async function adminUpsertProduct(input: {
  id?: string;
  name: string;
  categoryId: string;
  shortDescription?: string;
  description?: string;
  ingredients?: string;
  image?: string;
  isVisible?: boolean;
  featured?: boolean;
  noAddedSugar?: boolean;
  variants: {
    id?: string;
    sku?: string;
    size: string;
    price: number;
    stock: number;
  }[];
}): Promise<Product> {
  const snapshot = await getSheetsCatalogSnapshot({ bypassCache: true });
  const cleanName = input.name.trim();
  const baseSlug = slugify(input.id || cleanName) || `producto-${Date.now()}`;
  const existingIndex = snapshot.products.findIndex(
    (p) => p.id === (input.id || baseSlug) || p.slug === baseSlug,
  );
  const existing =
    existingIndex !== -1 ? snapshot.products[existingIndex] : undefined;

  const categoryId = slugify(input.categoryId) || "despensa-natural";
  const categoryExists = snapshot.categories.some((c) => c.id === categoryId);
  const nextCategories = categoryExists
    ? [...snapshot.categories]
    : [
        ...snapshot.categories,
        {
          id: categoryId,
          name: input.categoryId.trim(),
          image: "despensa",
          description: `Selección de ${input.categoryId.trim().toLowerCase()}.`,
        },
      ];

  const resolvedImgSrc = resolveSheetImage(
    input.image ?? existing?.images[0]?.src,
    cleanName,
    categoryId,
  );

  const builtVariants: ProductVariant[] = input.variants.map((v, idx) => {
    const cleanSize = v.size.trim() || "Unidad";
    const sizeKey = slugify(cleanSize) || String(idx + 1);
    const id = v.id?.trim() || `${baseSlug}-${sizeKey}`;
    const sku =
      v.sku?.trim() ||
      `RN-${String(snapshot.products.length + 1).padStart(4, "0")}-${String(idx + 1).padStart(2, "0")}`;
    return {
      id,
      sku,
      size: cleanSize,
      price: Math.max(1, Math.round(v.price)),
      stock: Math.max(0, Math.round(v.stock)),
    };
  });

  const tags: string[] = [];
  if (
    input.noAddedSugar ??
    existing?.tags.includes("sin-azucar-agregada") ??
    false
  ) {
    tags.push("sin-azucar-agregada");
  }

  const upserted: Product = {
    id: existing?.id ?? baseSlug,
    slug: existing?.slug ?? baseSlug,
    name: cleanName,
    categoryId,
    isVisible: input.isVisible ?? existing?.isVisible ?? true,
    featured: input.featured ?? existing?.featured ?? false,
    shortDescription:
      input.shortDescription?.trim() ||
      existing?.shortDescription ||
      `${cleanName} seleccionado para tu despensa.`,
    description:
      input.description?.trim() ||
      existing?.description ||
      `${cleanName} seleccionado para tu despensa en nuestra dietética.`,
    ingredients:
      input.ingredients?.trim() || existing?.ingredients || `${cleanName}.`,
    allergens:
      existing?.allergens ||
      "Fraccionado en un espacio que también manipula frutos secos, maní, gluten y sésamo. Consultá si necesitás certificación sin TACC.",
    storage:
      existing?.storage ||
      "Conservar en un recipiente cerrado, en un lugar fresco y seco, lejos de la luz directa.",
    images: [{ src: resolvedImgSrc, alt: cleanName }],
    tags,
    variants: builtVariants,
  };

  const nextProducts = [...snapshot.products];
  if (existingIndex !== -1) {
    nextProducts[existingIndex] = upserted;
  } else {
    nextProducts.unshift(upserted);
  }

  await persistCatalogSnapshot(nextProducts, nextCategories);
  return upserted;
}

export async function adminUpsertCategory(input: {
  id?: string;
  name: string;
  description?: string;
  image?: string;
}): Promise<Category> {
  const snapshot = await getSheetsCatalogSnapshot({ bypassCache: true });
  const cleanName = input.name.trim();
  const catId = slugify(input.id || cleanName) || `categoria-${Date.now()}`;

  const nextCategories = [...snapshot.categories];
  const existingIdx = nextCategories.findIndex((c) => c.id === catId);
  const existing = existingIdx !== -1 ? nextCategories[existingIdx] : undefined;

  const category: Category = {
    id: catId,
    name: cleanName,
    description:
      input.description?.trim() ||
      existing?.description ||
      `Selección de ${cleanName.toLowerCase()}.`,
    image: input.image?.trim() || existing?.image || "despensa",
  };

  if (existingIdx !== -1) {
    nextCategories[existingIdx] = category;
  } else {
    nextCategories.push(category);
  }

  await persistCatalogSnapshot(snapshot.products, nextCategories);
  return category;
}
