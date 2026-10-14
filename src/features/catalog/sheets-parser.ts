import type { Category, Product, ProductVariant } from "@/types/catalog";
import { categories as defaultCategories } from "@/features/catalog/data";
import { productImage } from "@/config/imagery";

const DEFAULT_STORAGE =
  "Conservar en un recipiente cerrado, en un lugar fresco y seco, lejos de la luz directa.";

const DEFAULT_ALLERGENS =
  "Fraccionado en un espacio que también manipula frutos secos, maní, gluten y sésamo. Consultá si necesitás certificación sin TACC.";

export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatProductName(raw: string): string {
  const cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/^[-–•]+\s*/, "")
    .trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Parses Argentine Peso prices from spreadsheet cells.
 * Handles formats like: 4500, "$ 4.500", "$4.500,00", "15.000", "4500.50"
 */
export function parseArsPrice(raw: string | number | undefined): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  }
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    normalized = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    normalized = cleaned.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  // Fix obvious typo like "$4" when meant to be "$4.000" in dietetica context (no item costs < $50 ARS)
  if (parsed < 15) return Math.round(parsed * 1000);
  return Math.round(parsed);
}

/**
 * Parses variant stock from spreadsheet cells.
 */
export function parseStock(raw: string | number | undefined): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
  }
  if (raw === undefined) return 0;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return 0;
  if (
    trimmed === "no" ||
    trimmed === "false" ||
    trimmed.includes("sin stock") ||
    trimmed.includes("agotado")
  ) {
    return 0;
  }
  if (trimmed === "si" || trimmed === "sí" || trimmed === "disponible") {
    return 15;
  }
  const digits = trimmed.replace(/[^\d-]/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function parseBoolean(
  raw: string | boolean | undefined,
  defaultValue: boolean,
): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw === undefined) return defaultValue;
  const normalized = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
  if (!normalized) return defaultValue;
  if (
    ["si", "true", "1", "x", "activo", "visible", "publicado", "yes"].includes(
      normalized,
    )
  ) {
    return true;
  }
  if (
    ["no", "false", "0", "oculto", "inactivo", "pausado"].includes(normalized)
  ) {
    return false;
  }
  return defaultValue;
}

/**
 * Cleans raw image URL strings (strips srcset descriptors like " 370w", trims whitespace, converts Drive links).
 */
export function sanitizeImageUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let trimmed = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  if (!trimmed) return null;

  // Strip trailing srcset descriptor like " 370w" or " 2x"
  trimmed = trimmed.replace(/\s+\d+[wx]$/i, "").trim();

  // Convert Google Drive share links to directlh3 CDN URLs
  const driveFileMatch =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ??
    trimmed.match(/drive\.google\.com\/(?:open|uc)\?.*?id=([a-zA-Z0-9_-]+)/);
  if (driveFileMatch?.[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // Encode any unescaped spaces inside the path
    const normalizedUrl = trimmed.replace(/\s/g, "%20");
    try {
      const parsed = new URL(normalizedUrl);
      if (parsed.hostname === "ejemplo.com.ar") return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Normalizes image references from Google Sheets:
 * - Converts Google Drive share links into direct CDN URLs
 * - Resolves built-in photo keys ("almendras", "nueces", "chia", etc.)
 * - Infers a photo from product name or category if left empty
 */
export function resolveSheetImage(
  rawImage: string | undefined,
  productName: string,
  categoryId: string,
): string {
  const sanitized = sanitizeImageUrl(rawImage);
  if (sanitized) return sanitized;

  const trimmed = rawImage?.trim() ?? "";
  if (trimmed) {
    const mapped = productImage(slugify(trimmed));
    if (mapped !== "/images/despensa.svg") {
      return mapped;
    }
  }

  const text = `${slugify(productName)} ${categoryId}`;
  if (text.includes("almendra")) return productImage("almendras");
  if (text.includes("nuez") || text.includes("nueces") || text.includes("pecan"))
    return productImage("nueces");
  if (text.includes("castana") || text.includes("caju") || text.includes("pistacho") || text.includes("avellana") || text.includes("mani"))
    return productImage("castanas");
  if (text.includes("chia") || text.includes("girasol") || text.includes("semilla") || text.includes("lino") || text.includes("sesamo") || text.includes("quinoa"))
    return productImage("chia");
  if (text.includes("granola") || text.includes("avena") || text.includes("cereal") || text.includes("almohadita"))
    return productImage("granola");

  return "/images/despensa.svg";
}

function detectDelimiter(headerLine: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i++) {
    const ch = headerLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch && ch in counts) {
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
  }
  if (
    (counts[";"] ?? 0) > (counts[","] ?? 0) &&
    (counts[";"] ?? 0) >= (counts["\t"] ?? 0)
  ) {
    return ";";
  }
  if ((counts["\t"] ?? 0) > (counts[","] ?? 0)) {
    return "\t";
  }
  return ",";
}

/**
 * Parses CSV text (comma, semicolon, or tab separated) into a 2D array of strings.
 */
export function parseCsvToMatrix(csvText: string): string[][] {
  const cleanedText = csvText.replace(/^\uFEFF/, "");
  const firstNewline = cleanedText.indexOf("\n");
  const firstLine =
    firstNewline === -1 ? cleanedText : cleanedText.slice(0, firstNewline);
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanedText.length; i++) {
    const ch = cleanedText[i];
    const next = cleanedText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch ?? "";
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if (ch === "\r" && next === "\n") {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      i++;
    } else if (ch === "\n" || ch === "\r") {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += ch ?? "";
    }
  }

  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

const COLUMN_ALIASES = {
  name: [
    "producto",
    "nombre",
    "titulo",
    "articulo",
    "name",
    "item",
    "nombre_producto",
  ],
  category: ["categoria", "rubro", "familia", "seccion", "category"],
  size: [
    "presentacion",
    "medida",
    "tamano",
    "peso",
    "variante",
    "formato",
    "envase",
    "unidad",
    "size",
    "variant",
  ],
  price: [
    "precio",
    "precio_ars",
    "precio_venta",
    "valor",
    "importe",
    "price",
    "ars",
  ],
  stock: [
    "stock",
    "cantidad",
    "disponible",
    "unidades",
    "existencia",
    "inventario",
  ],
  sku: ["sku", "codigo", "cod", "id_variante", "codigo_sku"],
  slug: ["slug", "id_producto", "id"],
  visible: ["visible", "activo", "publicado", "mostrar", "habilitado"],
  featured: ["destacado", "destacada", "featured", "inicio", "home"],
  noAddedSugar: [
    "sin_azucar",
    "sin_azucar_agregada",
    "sin_azucar_agregado",
    "no_added_sugar",
  ],
  shortDescription: [
    "descripcion_corta",
    "subtitulo",
    "resumen",
    "bajada",
    "short",
    "short_description",
  ],
  description: ["descripcion", "detalle", "notas_producto", "description"],
  ingredients: ["ingredientes", "composicion", "ingredients"],
  allergens: ["alergenos", "advertencias", "allergens"],
  storage: ["conservacion", "guardado", "almacenamiento", "storage"],
  image: ["imagen", "foto", "url_imagen", "imagen_url", "image"],
} as const;

type CanonicalField = keyof typeof COLUMN_ALIASES;

function buildHeaderMap(
  headers: readonly string[],
): Partial<Record<CanonicalField, number>> {
  const normalizedHeaders = headers.map(normalizeHeader);
  const map: Partial<Record<CanonicalField, number>> = {};

  (Object.keys(COLUMN_ALIASES) as CanonicalField[]).forEach((field) => {
    const aliases = COLUMN_ALIASES[field];
    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(alias);
      if (idx !== -1) {
        map[field] = idx;
        break;
      }
    }
  });

  return map;
}

function getCell(
  row: readonly string[],
  map: Partial<Record<CanonicalField, number>>,
  field: CanonicalField,
): string | undefined {
  const idx = map[field];
  if (idx === undefined) return undefined;
  const val = row[idx]?.trim();
  return val && val.length > 0 ? val : undefined;
}

/**
 * Detects whether a matrix uses the segmented "LISTA DE PRECIOS" layout
 * (with numbered section headers like "1 - ACEITES, VINAGRES Y SALSAS").
 */
export function isSegmentedPriceListMatrix(
  matrix: readonly (readonly string[])[],
): boolean {
  const sampleLimit = Math.min(matrix.length, 80);
  for (let i = 0; i < sampleLimit; i++) {
    const col0 = matrix[i]?.[0]?.trim() ?? "";
    const col1 = matrix[i]?.[1]?.trim() ?? "";
    if (/^\d+\s*-\s*[A-ZÁÉÍÓÚÑ]/i.test(col0)) {
      return true;
    }
    if (
      col1.toUpperCase().includes("LISTA DE PRECIOS") ||
      col1.toUpperCase().includes("INDICE DE RUBROS")
    ) {
      return true;
    }
  }
  return false;
}

function normalizeUnitHeader(rawHeader: string | undefined): string {
  if (!rawHeader) return "Unidad";
  const lower = rawHeader.toLowerCase().trim();
  if (lower.includes("100 gr") || lower.includes("100gr")) return "100 g";
  if (lower.includes("50 gr") || lower.includes("50gr")) return "50 g";
  if (lower.includes("250 gr") || lower.includes("250gr") || lower.includes("1/4"))
    return "250 g";
  if (
    lower.includes("1/2 kilo") ||
    lower.includes("1/2 kg") ||
    lower.includes("500 gr") ||
    lower.includes("medio kilo")
  )
    return "500 g";
  if (lower.includes("kilo") || lower.includes("kg")) return "1 kg";
  if (lower.includes("unidad")) return "Unidad";
  return "Unidad";
}

function normalizeInlineSizeLabel(rawSize: string): string {
  const lower = rawSize.toLowerCase().replace(/\s+/g, " ").trim();
  if (
    lower === "kg" ||
    lower === "kilo" ||
    lower === "1kg" ||
    lower === "1 kg" ||
    lower === "1 kilo"
  ) {
    return "1 kg";
  }
  if (
    lower === "1/2kg" ||
    lower === "1/2 kg" ||
    lower === "1/2 kilo" ||
    lower === "500gr" ||
    lower === "500 gr" ||
    lower === "500grs" ||
    lower === "500 grs" ||
    lower === "500gs" ||
    lower === "500 gs"
  ) {
    return "500 g";
  }
  if (
    lower === "250gr" ||
    lower === "250 gr" ||
    lower === "250grs" ||
    lower === "250 grs" ||
    lower === "250gs" ||
    lower === "250 gs" ||
    lower === "1/4 lt" ||
    lower === "1/4 kg"
  ) {
    return lower.includes("lt") ? "250 ml" : "250 g";
  }
  if (
    lower === "100gr" ||
    lower === "100 gr" ||
    lower === "100grs" ||
    lower === "100 grs"
  ) {
    return "100 g";
  }
  if (
    lower === "50gr" ||
    lower === "50 gr" ||
    lower === "50grs" ||
    lower === "50 grs"
  ) {
    return "50 g";
  }
  if (
    lower === "25gr" ||
    lower === "25 gr" ||
    lower === "25grs" ||
    lower === "25 grs"
  ) {
    return "25 g";
  }
  if (
    lower === "10gr" ||
    lower === "10 gr" ||
    lower === "10grs" ||
    lower === "10 grs"
  ) {
    return "10 g";
  }
  if (lower === "c/u" || lower === "unidad" || lower === "paq" || lower === "paquete") {
    return "Unidad";
  }
  return rawSize.trim();
}

/**
 * Extracts one or more (size, price) pairs from a spreadsheet price cell.
 * Handles:
 * - "$5.500" -> [{ size: defaultSize, price: 5500 }]
 * - "$2500 x 250 grs" -> [{ size: "250 g", price: 2500 }]
 * - "2500 xKG   1250x500gr" -> [{ size: "1 kg", price: 2500 }, { size: "500 g", price: 1250 }]
 * - "3500   $700x100gr" -> [{ size: defaultSize, price: 3500 }, { size: "100 g", price: 700 }]
 * - "Num 6 $990" or "chicos $330" -> [{ size: "Num 6", price: 990 }]
 * - "1800 0 x 100 grs" -> [{ size: "100 g", price: 1800 }]
 */
export function parsePriceCellVariants(
  cellValue: string | undefined,
  defaultSize: string,
): { size: string; price: number }[] {
  if (!cellValue) return [];
  const raw = cellValue.trim();
  if (!raw || raw.toLowerCase().includes("sin stock") || raw === "#REF!") {
    return [];
  }

  // Fix typo "1800 0 x 100 grs" -> "1800 x 100 grs"
  const normalizedCell = raw.replace(/(\d{3,})\s+0\s*(x|por)\b/i, "$1 $2");

  // Case 1: Multiple explicit "PRICE x UNIT" segments in one cell (e.g. "2500 xKG   1250x500gr")
  const multiPriceUnitRegex =
    /\$?\s*(\d+(?:\.\d{3})*(?:,\d+)?)\s*(?:x|por)\s*([a-zA-Z0-9/]+(?:\s*(?:grs?|gs|kg|kilo|ml|cc|lt|u|docena|maple|tableta|caja))?)/gi;
  const multiMatches = Array.from(normalizedCell.matchAll(multiPriceUnitRegex));

  if (multiMatches.length >= 2) {
    const results: { size: string; price: number }[] = [];
    for (const m of multiMatches) {
      const p = parseArsPrice(m[1]);
      if (p !== null && m[2]) {
        results.push({ size: normalizeInlineSizeLabel(m[2]), price: p });
      }
    }
    if (results.length > 0) return results;
  }

  // Case 2: "3500   $700x100gr" or "9000 paquete $1800 x100gr" or "10000 $1000 c/u"
  const dualSplitMatch = normalizedCell.match(
    /^\$?\s*(\d+(?:\.\d{3})*)\s*(?:paquete|caja)?\s+\$?\s*(\d+(?:\.\d{3})*)\s*(?:x|por)?\s*(100\s*grs?|c\/u)$/i,
  );
  if (dualSplitMatch?.[1] && dualSplitMatch[2] && dualSplitMatch[3]) {
    const p1 = parseArsPrice(dualSplitMatch[1]);
    const p2 = parseArsPrice(dualSplitMatch[2]);
    const results: { size: string; price: number }[] = [];
    if (p1 !== null) {
      results.push({
        size: dualSplitMatch[3].toLowerCase().includes("c/u")
          ? "Caja"
          : defaultSize,
        price: p1,
      });
    }
    if (p2 !== null) {
      results.push({
        size: normalizeInlineSizeLabel(dualSplitMatch[3]),
        price: p2,
      });
    }
    if (results.length > 0) return results;
  }

  // Case 3: Single "PRICE x/por UNIT" (e.g. "$2500 x 250 grs", "$3500 x docena", "$8400 por maple", "900 c/u")
  const singlePriceUnitMatch = normalizedCell.match(
    /^\$?\s*(\d+(?:\.\d{3})*(?:,\d+)?)\s*(?:x|por)?\s*(c\/u|(?:x|por)\s*[a-zA-Z0-9/\s]+|\d+\s*(?:grs?|gs|kg|ml|cc))$/i,
  );
  if (singlePriceUnitMatch?.[1] && singlePriceUnitMatch[2]) {
    const p = parseArsPrice(singlePriceUnitMatch[1]);
    const rawUnit = singlePriceUnitMatch[2]
      .replace(/^(?:x|por)\s*/i, "")
      .trim();
    if (p !== null && rawUnit) {
      return [{ size: normalizeInlineSizeLabel(rawUnit), price: p }];
    }
  }

  // Case 4: Prefix label + price (e.g. "Num 6 $990", "chicos $330", "grande 100")
  const prefixLabelMatch = normalizedCell.match(
    /^([a-zA-ZÁÉÍÓÚáéíóúñÑ]+(?:\s*\d+)?)\s+\$?\s*(\d+(?:\.\d{3})*(?:,\d+)?)$/,
  );
  if (prefixLabelMatch?.[1] && prefixLabelMatch[2]) {
    const p = parseArsPrice(prefixLabelMatch[2]);
    if (p !== null) {
      const label = prefixLabelMatch[1].trim();
      return [
        {
          size: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
          price: p,
        },
      ];
    }
  }

  // Standard numeric price
  const price = parseArsPrice(normalizedCell);
  if (price !== null) {
    return [{ size: defaultSize, price }];
  }

  return [];
}

/**
 * Normalizes a size unit string so pills look compact and consistent (e.g. "125 ml", "500 g", "1 kg", "60 comp.").
 */
function formatCleanSizeUnit(raw: string, categoryId = ""): string {
  const s = raw.replace(/\s+/g, " ").trim();
  const numUnitMatch = s.match(
    /^(\d+(?:[.,]\d+)?)\s*(ml|mk|cc|c|lts?|litros?|grs?|gs|g|kg|kh|kilos?|capsulas|cápsulas|caps?|comp|comprimidos|saquitos|sobres|u|unidades)$/i,
  );
  if (numUnitMatch?.[1] && numUnitMatch[2]) {
    const num = numUnitMatch[1].replace(",", ".");
    const unitRaw = numUnitMatch[2].toLowerCase();
    if (unitRaw === "ml" || unitRaw === "mk") return `${num} ml`;
    if (unitRaw === "cc") return `${num} cc`;
    if (unitRaw === "c") {
      if (categoryId.includes("complementos") && (num === "30" || num === "60" || num === "100")) {
        return `${num} comp.`;
      }
      return `${num} cc`;
    }
    if (unitRaw.startsWith("lt") || unitRaw.startsWith("litro")) return `${num} L`;
    if (unitRaw === "gr" || unitRaw === "grs" || unitRaw === "gs" || unitRaw === "g") return `${num} g`;
    if (unitRaw === "kg" || unitRaw === "kh" || unitRaw.startsWith("kilo")) return `${num} kg`;
    if (unitRaw.startsWith("cap")) return `${num} cáp.`;
    if (unitRaw.startsWith("comp")) return `${num} comp.`;
    if (unitRaw === "u" || unitRaw === "unidades") return `${num} u.`;
    return `${num} ${unitRaw}`;
  }
  return s;
}

/**
 * Extracts the base product name (without size/presentation tokens) and the normalized size label.
 * Used to consolidate multi-row products that share the same name and differ only in presentation/size.
 */
export function extractBaseProductAndSize(
  rawName: string,
  categoryId = "",
): {
  baseName: string;
  extractedSize: string | null;
} {
  const cleaned = formatProductName(rawName);

  const sizeRegexes: { regex: RegExp; format: (m: RegExpExecArray) => string }[] = [
    // e.g. "caja x 12", "caja x6", "pack x 3", "3 x 720 grs en un pack"
    {
      regex: /(?:^|\s)(?:x\s*)?(caja\s*x\s*\d+|pack\s*x\s*\d+|\d+\s*x\s*\d+\s*(?:grs?|gs|g)(?:\s*en\s*un\s*pack)?)(?=\s|$)/i,
      format: (m) => {
        const raw = m[1]!.replace(/\s+/g, " ").trim();
        const cajaMatch = raw.match(/^caja\s*x\s*(\d+)$/i);
        if (cajaMatch?.[1]) return `Caja x ${cajaMatch[1]}`;
        const packMatch = raw.match(/^pack\s*x\s*(\d+)$/i);
        if (packMatch?.[1]) return `Pack x ${packMatch[1]}`;
        return raw.replace(/\bgrs?\b|\bgs\b/i, "g").replace(/\s*en\s*un\s*pack/i, "");
      },
    },
    // e.g. "x 1/2 lt", "1/2 lt", "x 1/2 litro", "x 1/2 kg", "1/2 kg", "1/2kg", "x 1/2", "x litro"
    {
      regex: /(?:^|\s)(?:x\s*)?(1\/2\s*(?:lt|litro|kg|kilo)|1\/4\s*(?:lt|litro|kg|kilo)|un\s*litro|x\s*litro|x\s*1\/2|x\s*kilo|x\s*kg)(?=\s|$)/i,
      format: (m) => {
        const s = m[1]!.toLowerCase().replace(/\s+/g, " ").trim();
        if (s === "x 1/2") return "500 ml";
        if (s === "x litro" || s === "un litro") return "1 L";
        if (s === "x kilo" || s === "x kg") return "1 kg";
        return s
          .replace(/1\/2\s*(?:litro|lt)/i, "500 ml")
          .replace(/1\/2\s*(?:kilo|kg)/i, "500 g")
          .replace(/1\/4\s*(?:litro|lt)/i, "250 ml")
          .replace(/1\/4\s*(?:kilo|kg)/i, "250 g");
      },
    },
    // e.g. "600/400 grs"
    {
      regex: /(?:^|\s)(?:x\s*)?(\d+\/\d+\s*(?:grs?|gs|g|ml|cc))(?=\s|$)/i,
      format: (m) => m[1]!.replace(/\bgrs?\b|\bgs\b/i, "g").trim(),
    },
    // e.g. "125ml", "180mk", "30c", "250 cc", "500grs", "1kh", "2lt", "60 caps", "30 comp", "50 sobres"
    {
      regex: /(?:^|\s|-)(?:x\s*)?(\d+(?:[.,]\d+)?\s*(?:ml|mk|cc|c|lts?|litros?|grs?|gs|g|kg|kh|kilos?|capsulas|cápsulas|caps?|comp|comprimidos|saquitos|sobres|u|unidades))(?=\s|$|\))/i,
      format: (m) => formatCleanSizeUnit(m[1]!, categoryId),
    },
    // e.g. "x 250", "x 500", "x 100", "x 12", "x 6", "x30"
    {
      regex: /(?:^|\s)x\s*(\d{1,4})\b/i,
      format: (m) => {
        const n = m[1]!;
        if (categoryId.includes("golosinas") && (n === "6" || n === "12")) {
          return `Caja x ${n}`;
        }
        if (categoryId.includes("aceites") && (n === "250" || n === "500")) {
          return `${n} ml`;
        }
        return `x ${n}`;
      },
    },
    // e.g. "chico", "mediano", "grande", "x tableta", "paquete", "frasquito", "blistera"
    {
      regex: /(?:^|\s)(?:x\s*)?\b(chico|mediano|grande|pequeñ[oa]s?|individual|frasquito|paquete|frasco|tableta|petaca|spray|blistera)\b/i,
      format: (m) => {
        const w = m[1]!.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1);
      },
    },
  ];

  let working = cleaned;
  const foundSizes: string[] = [];

  for (const { regex, format } of sizeRegexes) {
    const match = regex.exec(working);
    if (match) {
      foundSizes.push(format(match));
      working = (
        working.slice(0, match.index) +
        " " +
        working.slice(match.index + match[0].length)
      )
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  working = working
    .replace(/\b(?:x|por|en|de)\s*$/i, "")
    .replace(/[-–•]+\s*$/, "")
    .replace(/\s+-\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Remove duplicate trailing brand tokens (e.g. "aceite de coco oh yeah 250gr oh yeah")
  const words = working.split(" ");
  if (words.length >= 4) {
    const lastTwo = words.slice(-2).join(" ").toLowerCase();
    const earlier = words.slice(0, -2).join(" ").toLowerCase();
    if (earlier.includes(lastTwo)) {
      working = words.slice(0, -2).join(" ");
    }
  }

  return {
    baseName: formatProductName(working || cleaned),
    extractedSize: foundSizes.length > 0 ? foundSizes.join(" ") : null,
  };
}

function buildProductGroupKey(categoryId: string, baseName: string): string {
  const stopWords = new Set([
    "de",
    "del",
    "el",
    "la",
    "los",
    "las",
    "y",
    "para",
    "en",
    "con",
    "por",
    "x",
    "al",
  ]);
  const tokens = slugify(baseName)
    .replace(/\baceire\b|\baceita\b/g, "aceite")
    .replace(/\bextea\b/g, "extra")
    .replace(/\bgood\b/g, "god")
    .replace(/\bbebile\b/g, "bebible")
    .split("-")
    .filter((t) => t.length > 0 && !stopWords.has(t))
    .sort();
  return `${categoryId}::${tokens.join("-")}`;
}

/**
 * Extracts embedded presentation from a unit product name if present
 * (e.g. "Aceite de coco GB 125ml neutro" -> "125 ml", "Barilla x500gr" -> "500 g")
 */
function extractSizeFromProductName(
  name: string,
  fallbackSize: string,
  categoryId = "",
): string {
  if (fallbackSize !== "Unidad") return fallbackSize;
  const { extractedSize } = extractBaseProductAndSize(name, categoryId);
  return extractedSize ?? fallbackSize;
}

function formatCategoryTitle(rawSectionName: string): string {
  const withoutNumber = rawSectionName
    .replace(/^\d+\s*-\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!withoutNumber) return "Despensa";
  const lower = withoutNumber.toLowerCase();
  return (
    lower.charAt(0).toUpperCase() +
    lower.slice(1).replace(/\btacc\b/gi, "TACC")
  );
}

/**
 * Parses the segmented "LISTA DE PRECIOS" layout (like "lista de precios dietetica - Hoja 1.csv"),
 * automatically resolving section headers, unit subheaders, multi-variant rows,
 * consolidating multi-row size presentations into a single product card, and preserving web image URLs.
 */
function parseSegmentedPriceListMatrix(
  matrix: readonly (readonly string[])[],
): { products: Product[]; categories: Category[] } {
  const categoryMap = new Map<string, Category>();

  type ParsedRowEntry = {
    rowIndex: number;
    cleanName: string;
    baseName: string;
    extractedSize: string | null;
    groupKey: string;
    categoryId: string;
    categoryName: string;
    colC: string;
    colCUnit: string;
    directImageUrl: string | null;
    noAddedSugar: boolean;
    effectiveVariants: { size: string; price: number; outOfStock?: boolean }[];
  };

  const parsedEntries: ParsedRowEntry[] = [];
  const entriesByGroupKey = new Map<string, ParsedRowEntry[]>();

  let currentCategory: Category | null = null;
  let colCUnit = "Unidad";
  let colDUnit = "1 kg";
  let lastPricedVariantsInCategory: { size: string; price: number }[] = [];

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;

    const colA = row[0]?.trim() ?? "";
    const colB = row[1]?.trim() ?? "";
    const colC = row[2]?.trim() ?? "";
    const colD = row[3]?.trim() ?? "";
    const colE = row[4]?.trim() ?? "";

    // Check for numbered section header in colA: e.g. "1 - ACEITES, VINAGRES Y SALSAS"
    if (/^\d+\s*-\s*[A-ZÁÉÍÓÚÑ]/i.test(colA)) {
      const catName = formatCategoryTitle(colA);
      const catId = slugify(catName) || `rubro-${r}`;
      let cat = categoryMap.get(catId);
      if (!cat) {
        cat = {
          id: catId,
          name: catName,
          image: resolveSheetImage(undefined, catName, catId),
          description: `Variedad de ${catName.toLowerCase()} seleccionados en nuestra dietética.`,
        };
        categoryMap.set(catId, cat);
      }
      currentCategory = cat;
      colCUnit = normalizeUnitHeader(colC || "$ por unidad");
      colDUnit = colD ? normalizeUnitHeader(colD) : "1 kg";
      lastPricedVariantsInCategory = [];
      continue;
    }

    // Ignore index rows before the first section starts
    if (!currentCategory) continue;

    // Check for special sub-sections in colB ("HELADERA", "FREEZER")
    if (
      (colB === "HELADERA" || colB === "FREEZER") &&
      !colC &&
      !colD
    ) {
      const catName =
        colB === "HELADERA"
          ? "Refrigerados y heladera"
          : "Congelados y freezer";
      const catId = slugify(catName);
      let cat = categoryMap.get(catId);
      if (!cat) {
        cat = {
          id: catId,
          name: catName,
          image: "/images/despensa.svg",
          description: `Productos de ${catName.toLowerCase()}.`,
        };
        categoryMap.set(catId, cat);
      }
      currentCategory = cat;
      colCUnit = "Unidad";
      lastPricedVariantsInCategory = [];
      continue;
    }

    // Check for subsection unit header row (colA and colB empty, colC starts with "$ por" or "x ")
    if (
      !colA &&
      !colB &&
      (colC.toLowerCase().includes("por ") ||
        colC.toLowerCase().includes("kilo") ||
        colC.toLowerCase().includes("100 gr") ||
        colC.toLowerCase().includes("unidad"))
    ) {
      colCUnit = normalizeUnitHeader(colC);
      if (colD) {
        colDUnit = normalizeUnitHeader(colD);
      }
      continue;
    }

    // Must have a product name in colB
    if (!colB || colB.toLowerCase() === "aaa") continue;

    const cleanName = formatProductName(colB);
    const baseSlug = slugify(cleanName);
    if (!baseSlug || baseSlug.length < 2) continue;

    const cVariants = parsePriceCellVariants(colC, colCUnit);
    const dVariants = parsePriceCellVariants(colD, colDUnit);
    let rowVariants = [...cVariants, ...dVariants];

    const isExplicitlyOutOfStock =
      colC.toLowerCase().includes("sin stock") ||
      colD.toLowerCase().includes("sin stock");

    // In the .xlsx, some groups of consecutive rows share a multi-row merged price cell (C/D)
    if (rowVariants.length === 0 && !isExplicitlyOutOfStock) {
      let foundLookahead: { size: string; price: number }[] = [];
      for (let look = r + 1; look < Math.min(matrix.length, r + 13); look++) {
        const lRow = matrix[look];
        if (!lRow) continue;
        const lA = lRow[0]?.trim() ?? "";
        const lB = lRow[1]?.trim() ?? "";
        const lC = lRow[2]?.trim() ?? "";
        const lD = lRow[3]?.trim() ?? "";
        if (/^\d+\s*-\s*[A-ZÁÉÍÓÚÑ]/i.test(lA)) break;
        if (!lB) continue;
        const lVars = [
          ...parsePriceCellVariants(lC, colCUnit),
          ...parsePriceCellVariants(lD, colDUnit),
        ];
        if (lVars.length > 0) {
          foundLookahead = lVars.map((v) => ({ ...v }));
          break;
        }
      }

      if (lastPricedVariantsInCategory.length > 0) {
        rowVariants = lastPricedVariantsInCategory.map((v) => ({ ...v }));
      } else if (foundLookahead.length > 0) {
        rowVariants = foundLookahead;
      } else {
        continue;
      }
    } else if (rowVariants.length > 0) {
      lastPricedVariantsInCategory = rowVariants.map((v) => ({ ...v }));
    }

    // Fix typo where 100g and 1kg have the exact same price (e.g. "$1.100" and "$1.100" for 1kg)
    if (
      rowVariants.length === 2 &&
      rowVariants[0]?.size === "100 g" &&
      rowVariants[1]?.size === "1 kg" &&
      rowVariants[0].price === rowVariants[1].price
    ) {
      rowVariants[1].price = rowVariants[0].price * 10;
    }

    const noAddedSugar =
      cleanName.toLowerCase().includes("sin azucar") ||
      cleanName.toLowerCase().includes("sin azúcar") ||
      cleanName.toLowerCase().includes("stevia") ||
      currentCategory.id.includes("sin-azucar") ||
      currentCategory.id.includes("frutos-secos") ||
      currentCategory.id.includes("semillas") ||
      currentCategory.id.includes("legumbres") ||
      currentCategory.id.includes("especias");

    const directImageUrl = sanitizeImageUrl(colE);
    if (
      directImageUrl &&
      !currentCategory.image.startsWith("http://") &&
      !currentCategory.image.startsWith("https://")
    ) {
      currentCategory.image = directImageUrl;
    }

    const { baseName, extractedSize } = extractBaseProductAndSize(
      colB,
      currentCategory.id,
    );
    const groupKey = buildProductGroupKey(currentCategory.id, baseName);

    const effectiveVariants =
      rowVariants.length > 0
        ? rowVariants
        : [{ size: colCUnit, price: 1000, outOfStock: true as const }];

    const entry: ParsedRowEntry = {
      rowIndex: r,
      cleanName,
      baseName,
      extractedSize,
      groupKey,
      categoryId: currentCategory.id,
      categoryName: currentCategory.name,
      colC,
      colCUnit,
      directImageUrl,
      noAddedSugar,
      effectiveVariants,
    };

    parsedEntries.push(entry);
    const groupList = entriesByGroupKey.get(groupKey);
    if (groupList) {
      groupList.push(entry);
    } else {
      entriesByGroupKey.set(groupKey, [entry]);
    }
  }

  // Determine which groupKeys represent true multi-row size groups
  const validMultiSizeGroupKeys = new Set<string>();
  for (const [gKey, entries] of entriesByGroupKey.entries()) {
    if (
      entries.length > 1 &&
      (entries.some((e) => e.extractedSize !== null) ||
        entries.some((e) => /num\s*\d+/i.test(e.colC)))
    ) {
      validMultiSizeGroupKeys.add(gKey);
    }
  }

  type ProductDraft = {
    id: string;
    slug: string;
    name: string;
    categoryId: string;
    categoryName: string;
    directImageUrls: string[];
    noAddedSugar: boolean;
    featured: boolean;
    isVisible: boolean;
    variants: ProductVariant[];
  };

  const productMap = new Map<string, ProductDraft>();
  const groupKeyToProductSlug = new Map<string, string>();
  const usedVariantIds = new Set<string>();
  const usedSkus = new Set<string>();

  for (const entry of parsedEntries) {
    const isMultiRowSizeGroup = validMultiSizeGroupKeys.has(entry.groupKey);
    const displayProductName = isMultiRowSizeGroup
      ? entry.baseName
      : entry.cleanName;
    const baseSlug = slugify(displayProductName) || `producto-${entry.rowIndex}`;

    let existingSlug = isMultiRowSizeGroup
      ? groupKeyToProductSlug.get(entry.groupKey)
      : undefined;

    let draft = existingSlug ? productMap.get(existingSlug) : undefined;

    if (!draft) {
      let productSlug = baseSlug;
      if (productMap.has(productSlug)) {
        const withCat = `${baseSlug}-${entry.categoryId}`;
        if (!productMap.has(withCat)) {
          productSlug = withCat;
        } else {
          let sfx = 2;
          while (productMap.has(`${baseSlug}-${sfx}`)) {
            sfx++;
          }
          productSlug = `${baseSlug}-${sfx}`;
        }
      }

      draft = {
        id: productSlug,
        slug: productSlug,
        name: displayProductName,
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        directImageUrls: entry.directImageUrl ? [entry.directImageUrl] : [],
        noAddedSugar: entry.noAddedSugar,
        featured: Boolean(entry.directImageUrl),
        isVisible: true,
        variants: [],
      };
      productMap.set(productSlug, draft);
      if (isMultiRowSizeGroup) {
        groupKeyToProductSlug.set(entry.groupKey, productSlug);
      }
      existingSlug = productSlug;
    } else {
      if (
        entry.directImageUrl &&
        !draft.directImageUrls.includes(entry.directImageUrl)
      ) {
        draft.directImageUrls.push(entry.directImageUrl);
      }
      if (entry.directImageUrl) {
        draft.featured = true;
      }
      if (entry.noAddedSugar) {
        draft.noAddedSugar = true;
      }
    }

    for (const rv of entry.effectiveVariants) {
      let resolvedSize =
        entry.effectiveVariants.length === 1
          ? (entry.extractedSize ??
            extractSizeFromProductName(
              entry.cleanName,
              rv.size,
              entry.categoryId,
            ))
          : rv.size;

      if (isMultiRowSizeGroup && resolvedSize === "Unidad" && entry.extractedSize === null) {
        resolvedSize = "Clásico";
      }

      // Check if an identical (size, price) variant already exists on this draft (e.g. duplicate rows in sheet)
      const normalizedNewSize = slugify(resolvedSize);
      const duplicateVariant = draft.variants.find(
        (v) => slugify(v.size) === normalizedNewSize && v.price === rv.price,
      );
      if (duplicateVariant) {
        if (!duplicateVariant.image && entry.directImageUrl) {
          duplicateVariant.image = entry.directImageUrl;
        }
        continue;
      }

      const sizeKey = normalizedNewSize || String(draft.variants.length + 1);
      let variantId = `${draft.slug}-${sizeKey}`;
      let suffix = 2;
      while (usedVariantIds.has(variantId)) {
        variantId = `${draft.slug}-${sizeKey}-${suffix}`;
        suffix++;
      }
      usedVariantIds.add(variantId);

      const productIdx = productMap.size;
      const variantIdx = draft.variants.length + 1;
      let sku = `RN-${String(productIdx).padStart(4, "0")}-${String(variantIdx).padStart(2, "0")}`;
      let skuSuffix = 2;
      while (usedSkus.has(sku)) {
        sku = `${sku}-${skuSuffix}`;
        skuSuffix++;
      }
      usedSkus.add(sku);

      const stock = "outOfStock" in rv && rv.outOfStock ? 0 : 15;

      draft.variants.push({
        id: variantId,
        sku,
        size: resolvedSize,
        price: rv.price,
        stock,
        ...(entry.directImageUrl ? { image: entry.directImageUrl } : {}),
      });
    }
  }

  const productsList: Product[] = [];

  for (const draft of productMap.values()) {
    // Sort variants from smallest to largest price so size selector buttons follow a natural order
    if (draft.variants.length > 1) {
      draft.variants.sort((a, b) => a.price - b.price);
    }

    const fallbackImageSrc = resolveSheetImage(
      undefined,
      draft.name,
      draft.categoryId,
    );
    const imageUrls =
      draft.directImageUrls.length > 0
        ? draft.directImageUrls
        : [fallbackImageSrc];

    const sizesSummary = draft.variants.map((v) => v.size).join(" · ");

    productsList.push({
      id: draft.id,
      slug: draft.slug,
      name: draft.name,
      categoryId: draft.categoryId,
      shortDescription: `${draft.categoryName} · ${sizesSummary}`,
      description: `${draft.name} disponible en ${sizesSummary}. Seleccionado para tu despensa en nuestra dietética.`,
      ingredients: `${draft.name}.`,
      allergens: DEFAULT_ALLERGENS,
      storage: DEFAULT_STORAGE,
      images: imageUrls.map((src) => ({
        src,
        alt: draft.name,
      })),
      tags: draft.noAddedSugar ? ["sin-azucar-agregada"] : [],
      featured: draft.featured,
      isVisible: draft.isVisible,
      variants: draft.variants,
    });
  }

  return {
    products: productsList,
    categories: Array.from(categoryMap.values()),
  };
}

/**
 * Converts a 2D spreadsheet matrix into grouped Products and Categories.
 * Supports BOTH standard tabular sheets and the segmented "LISTA DE PRECIOS" layout.
 */
export function matrixToCatalog(
  matrix: readonly (readonly string[])[],
  baseCategories: readonly Category[] = defaultCategories,
): { products: Product[]; categories: Category[] } {
  if (isSegmentedPriceListMatrix(matrix)) {
    return parseSegmentedPriceListMatrix(matrix);
  }

  const headerRow = matrix[0];
  if (!headerRow || matrix.length < 2) {
    return { products: [], categories: [...baseCategories] };
  }

  const headerMap = buildHeaderMap(headerRow);
  const categoryMap = new Map<string, Category>();
  for (const cat of baseCategories) {
    categoryMap.set(cat.id, { ...cat });
  }

  type ProductDraft = {
    id: string;
    slug: string;
    name: string;
    categoryId: string;
    description: string;
    shortDescription: string;
    ingredients: string;
    allergens: string;
    storage: string;
    imageSrcs: string[];
    noAddedSugar: boolean;
    featured: boolean;
    isVisible: boolean;
    variants: ProductVariant[];
  };

  const productMap = new Map<string, ProductDraft>();
  const usedVariantIds = new Set<string>();
  const usedSkus = new Set<string>();
  const discoveredCategoryOrder: string[] = [];
  const discoveredCategoryIds = new Set<string>();

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex];
    if (!row) continue;

    const rawName = getCell(row, headerMap, "name");
    const rawPrice = getCell(row, headerMap, "price");
    if (!rawName) continue;

    const price = parseArsPrice(rawPrice);
    if (price === null) continue;

    const rawSlug = getCell(row, headerMap, "slug");
    const productSlug = slugify(rawSlug ?? rawName);
    if (!productSlug) continue;

    const rawCategory = getCell(row, headerMap, "category") ?? "Frutos secos";
    const categorySlug = slugify(rawCategory) || "despensa";

    let matchedCategory =
      categoryMap.get(categorySlug) ??
      Array.from(categoryMap.values()).find(
        (c) => slugify(c.name) === categorySlug,
      );

    if (!matchedCategory) {
      matchedCategory = {
        id: categorySlug,
        name: rawCategory.trim(),
        image: resolveSheetImage(undefined, rawCategory, categorySlug),
        description: `Selección de ${rawCategory.trim().toLowerCase()} para tu despensa.`,
      };
      categoryMap.set(matchedCategory.id, matchedCategory);
    }
    if (!discoveredCategoryIds.has(matchedCategory.id)) {
      discoveredCategoryIds.add(matchedCategory.id);
      discoveredCategoryOrder.push(matchedCategory.id);
    }

    const size = getCell(row, headerMap, "size") ?? "Unidad";
    const stock = parseStock(getCell(row, headerMap, "stock") ?? "15");
    const isVisible = parseBoolean(getCell(row, headerMap, "visible"), true);
    const featured = parseBoolean(getCell(row, headerMap, "featured"), false);
    const noAddedSugar = parseBoolean(
      getCell(row, headerMap, "noAddedSugar"),
      true,
    );

    const rawImageCell = getCell(row, headerMap, "image");
    const directWebImage = sanitizeImageUrl(rawImageCell);
    const rowImageSrc = resolveSheetImage(
      rawImageCell,
      rawName,
      matchedCategory.id,
    );

    if (
      (rowImageSrc.startsWith("http://") ||
        rowImageSrc.startsWith("https://")) &&
      !matchedCategory.image.startsWith("http://") &&
      !matchedCategory.image.startsWith("https://")
    ) {
      matchedCategory.image = rowImageSrc;
    }

    let draft = productMap.get(productSlug);
    if (!draft) {
      const shortDescription =
        getCell(row, headerMap, "shortDescription") ??
        `Seleccionado para tu despensa · ${matchedCategory.name}`;
      const description =
        getCell(row, headerMap, "description") ??
        `${rawName} de excelente calidad, fraccionado cuidando su frescura y sabor natural.`;
      const ingredients =
        getCell(row, headerMap, "ingredients") ?? `${rawName}.`;
      const allergens =
        getCell(row, headerMap, "allergens") ?? DEFAULT_ALLERGENS;
      const storage = getCell(row, headerMap, "storage") ?? DEFAULT_STORAGE;

      draft = {
        id: productSlug,
        slug: productSlug,
        name: rawName,
        categoryId: matchedCategory.id,
        description,
        shortDescription,
        ingredients,
        allergens,
        storage,
        imageSrcs: [rowImageSrc],
        noAddedSugar,
        featured,
        isVisible,
        variants: [],
      };
      productMap.set(productSlug, draft);
    } else {
      if (featured) draft.featured = true;
      if (!isVisible && draft.variants.length === 0) draft.isVisible = false;
      if (rowImageSrc.startsWith("http")) {
        // Put real web images ahead of local SVG placeholders
        draft.imageSrcs = draft.imageSrcs.filter((s) => s.startsWith("http"));
        if (!draft.imageSrcs.includes(rowImageSrc)) {
          draft.imageSrcs.push(rowImageSrc);
        }
      } else if (!draft.imageSrcs.includes(rowImageSrc) && draft.imageSrcs.length === 0) {
        draft.imageSrcs.push(rowImageSrc);
      }
    }

    const sizeKey = size
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    let variantId = `${productSlug}-${sizeKey || String(draft.variants.length + 1)}`;
    let suffix = 2;
    while (usedVariantIds.has(variantId)) {
      variantId = `${productSlug}-${sizeKey}-${suffix}`;
      suffix++;
    }
    usedVariantIds.add(variantId);

    const productIndex = productMap.size;
    const variantIndex = draft.variants.length + 1;
    const rawSku = getCell(row, headerMap, "sku");
    let sku =
      rawSku ??
      `RN-${String(productIndex).padStart(4, "0")}-${String(variantIndex).padStart(2, "0")}`;
    let skuSuffix = 2;
    while (usedSkus.has(sku)) {
      sku = `${rawSku ?? "RN"}-${skuSuffix}`;
      skuSuffix++;
    }
    usedSkus.add(sku);

    draft.variants.push({
      id: variantId,
      sku,
      size,
      price,
      stock,
      ...(directWebImage ? { image: directWebImage } : {}),
    });
  }

  const parsedProducts: Product[] = Array.from(productMap.values())
    .filter((d) => d.variants.length > 0)
    .map((d) => {
      const sizesSummary = d.variants.map((v) => v.size).join(" · ");
      const updatedShortDescription =
        d.variants.length > 1 && !d.shortDescription.includes("·")
          ? `${d.shortDescription} · ${sizesSummary}`
          : d.shortDescription;

      return {
        id: d.id,
        slug: d.slug,
        name: d.name,
        categoryId: d.categoryId,
        description: d.description,
        shortDescription: updatedShortDescription,
        ingredients: d.ingredients,
        allergens: d.allergens,
        storage: d.storage,
        images: (d.imageSrcs.length > 0 ? d.imageSrcs : ["/images/despensa.svg"]).map(
          (src) => ({
            src,
            alt: d.name,
          }),
        ),
        tags: d.noAddedSugar ? ["sin-azucar-agregada"] : [],
        featured: d.featured,
        isVisible: d.isVisible,
        variants: d.variants,
      };
    });

  // Return categories in the exact order they appear in the spreadsheet
  const finalCategories =
    parsedProducts.length > 30
      ? discoveredCategoryOrder
          .map((id) => categoryMap.get(id))
          .filter((c): c is Category => Boolean(c))
      : Array.from(categoryMap.values());

  return {
    products: parsedProducts,
    categories: finalCategories,
  };
}

export function parseCsvToCatalog(
  csvText: string,
  baseCategories: readonly Category[] = defaultCategories,
): { products: Product[]; categories: Category[] } {
  const matrix = parseCsvToMatrix(csvText);
  return matrixToCatalog(matrix, baseCategories);
}

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports a catalog into a clean CSV ready to be imported into Google Sheets.
 */
export function catalogToCsv(
  productsList: readonly Product[],
  categoriesList: readonly Category[],
): string {
  const categoryNameById = new Map(categoriesList.map((c) => [c.id, c.name]));
  const headers = [
    "SKU",
    "Producto",
    "Categoria",
    "Presentacion",
    "Precio_ARS",
    "Stock",
    "Visible",
    "Destacado",
    "Sin_Azucar",
    "Descripcion_Corta",
    "Descripcion",
    "Ingredientes",
    "Alergenos",
    "Conservacion",
    "Imagen",
    "Slug",
  ];

  const lines: string[] = [headers.join(",")];

  for (const product of productsList) {
    const categoryName =
      categoryNameById.get(product.categoryId) ?? product.categoryId;
    const noAddedSugar = product.tags.includes("sin-azucar-agregada");
    const defaultImageSrc = product.images[0]?.src ?? "/images/despensa.svg";

    for (const variant of product.variants) {
      const variantImageSrc = variant.image ?? defaultImageSrc;
      const row = [
        variant.sku,
        product.name,
        categoryName,
        variant.size,
        variant.price,
        variant.stock,
        product.isVisible ? "SI" : "NO",
        product.featured ? "SI" : "NO",
        noAddedSugar ? "SI" : "NO",
        product.shortDescription,
        product.description,
        product.ingredients,
        product.allergens,
        product.storage,
        variantImageSrc,
        product.slug,
      ];
      lines.push(row.map(escapeCsvCell).join(","));
    }
  }

  return lines.join("\n");
}
