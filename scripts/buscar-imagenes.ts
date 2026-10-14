import fs from 'node:fs';
import path from 'node:path';

interface BingParsedMetadata {
  murl?: string;
  purl?: string;
  t?: string;
  turl?: string;
  w?: number;
  h?: number;
  mw?: number;
  mh?: number;
  [key: string]: unknown;
}

interface ImageCandidate {
  contentUrl: string;
  hostPageUrl: string;
  name: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  encodingFormat: string;
}

interface CacheData {
  [productKey: string]: {
    url: string;
    title: string;
    source: string;
    foundAt: string;
  };
}

interface TargetAttributes {
  size?: {
    raw: string;
    value: number;
    type: 'volume' | 'weight';
    equivalents: string[];
  } | undefined;
  variants: {
    isNeutro: boolean;
    isVirgen: boolean;
    isSinSal: boolean;
    isConSal: boolean;
    isCrunchy: boolean;
    isCremosa: boolean;
    isSinTacc: boolean;
    isOrganico: boolean;
  };
  brand?: string | undefined;
}

const CACHE_FILE = path.resolve(process.cwd(), '.data', 'imagenes-cache.json');
const OUTPUT_CSV = path.resolve(
  process.cwd(),
  'catalogo-con-imagenes-actualizadas.csv'
);
const OUTPUT_COL_E = path.resolve(process.cwd(), 'solo-columna-e-imagenes.txt');

function ensureDataDir() {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadCache(): CacheData {
  ensureDataDir();
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveCache(cache: CacheData) {
  ensureDataDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

// Dominios argentinos y plataformas preferidas para dietéticas
const TRUSTED_DOMAINS = [
  'dieteticamari.com',
  'thefoodmarket.com.ar',
  'thefoodmarketar.vtexassets.com',
  'cardamom-bazarorganico.com.ar',
  'coquitosvenado.com.ar',
  'conexionnatural.com.ar',
  'el-sembrador.com.ar',
  'meganuts.com.ar',
  'mitiendanube.com',
  'tiendanube.com',
  'mercadolibre.com.ar',
  'mlstatic.com',
  'farmacity.com',
  'cotodigital.com.ar',
  'jumbo.com.ar',
  'disco.com.ar',
  'vitalcer.com',
  'tomypa.com.ar',
  'saboresandinos.com',
  'dieteticaalmendra.com.ar',
  'dieteticasnaturales.com.ar',
  'huertagrandebiodinamica.com.ar',
  'vidanatural.ar',
  'kibou.com.ar',
];

// Marcas reconocidas del mercado argentino de dietética
const KNOWN_BRANDS = [
  'god bless you',
  'savona fit',
  'chia graal',
  'graal',
  'beepure',
  'mk',
  'el cosaco',
  'doña magdalena',
  'entrenuts',
  'kony',
  'green leaf',
  'vitawellness',
  'bionativa',
  'nutra sem',
  'sol azteca',
  'hileret',
  'trini',
  'natier',
  'cachafaz',
  'weleda',
  'heredia',
  'dicomere',
  'pura vida',
  'las brisas',
  'yinyang',
  'schär',
  'schar',
  'deli & raw',
  'delicel',
  'smams',
  'green food makers',
  'quinto zotto',
  'pampa gourmet',
];

/**
 * 1. Normalización de nombres de productos:
 * - Corrige errores tipográficos comunes en unidades y términos.
 * - Expande abreviaturas conocidas de marcas.
 * - Limpia caracteres y palabras que confunden al buscador.
 */
export function normalizeProductName(name: string): string {
  let s = name.trim();

  // Errores tipográficos comunes en nombres
  s = s.replace(/\baceire\b/gi, 'aceite');
  s = s.replace(/\bgood\s+bless\s+you\b/gi, 'God Bless You');

  // Abreviaturas de marcas
  s = s.replace(/\bgb\b/gi, 'God Bless You');
  s = s.replace(/\bdr\s+scharr?\b/gi, 'Schär');
  s = s.replace(/\bdña\b/gi, 'Doña');

  // Corrección de unidades (ej: 180mk -> 180ml, grs -> g, cc -> ml)
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*mk\b/gi, '$1ml');
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*grs?\b/gi, '$1g');
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*cc\b/gi, '$1ml');
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*lts?\b/gi, '$1lt');
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*k(?:g|gr|ilos?)?\b/gi, '$1kg');

  // Limpiar espacios duplicados y comillas
  s = s.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Extrae atributos objetivos del producto (tamaño, variantes opuestas y marca)
 * para realizar scoring estricto sobre los resultados encontrados.
 */
export function extractTargetAttributes(name: string): TargetAttributes {
  const lower = name.toLowerCase();

  // 1. Extraer tamaño
  let size: TargetAttributes['size'] = undefined;

  const volMatch = lower.match(/\b(\d+(?:[.,]\d+)?)\s*(ml|cc|lts?|litros?)\b/);
  const wtMatch = lower.match(/\b(\d+(?:[.,]\d+)?)\s*(grs?|g|kgs?|kilos?)\b/);

  if (volMatch && volMatch[1] && volMatch[2]) {
    const val = parseFloat(volMatch[1].replace(',', '.'));
    const unit = volMatch[2];
    const isLiter = unit.startsWith('lt') || unit.startsWith('l');
    const mlValue = isLiter ? val * 1000 : val;
    const equivs = [
      `${mlValue}ml`,
      `${mlValue} ml`,
      `${mlValue}cc`,
      `${mlValue} cc`,
      `x ${mlValue}`,
      `x${mlValue}`,
    ];
    if (mlValue === 1000) {
      equivs.push('1lt', '1 lt', '1l', '1 litro', '1000cc');
    }
    size = {
      raw: volMatch[0],
      value: mlValue,
      type: 'volume',
      equivalents: equivs,
    };
  } else if (wtMatch && wtMatch[1] && wtMatch[2]) {
    const val = parseFloat(wtMatch[1].replace(',', '.'));
    const unit = wtMatch[2];
    const isKg = unit.startsWith('kg') || unit.startsWith('kilo');
    const gValue = isKg ? val * 1000 : val;
    const equivs = [
      `${gValue}g`,
      `${gValue} g`,
      `${gValue}gr`,
      `${gValue} gr`,
      `x ${gValue}`,
      `x${gValue}`,
    ];
    if (gValue === 1000) {
      equivs.push('1kg', '1 kg', '1 kilo', '1000g');
    } else if (gValue === 500) {
      equivs.push('1/2 kg', 'medio kilo', '500g', '500 g');
    } else if (gValue === 250) {
      equivs.push('1/4 kg', '250g', '250 g');
    }
    size = {
      raw: wtMatch[0],
      value: gValue,
      type: 'weight',
      equivalents: equivs,
    };
  }

  // 2. Extraer variantes clave
  const isNeutro = /\bneutro\b/.test(lower);
  const isVirgen = /\bvirgen\b/.test(lower);
  const isSinSal = /\bsin\s+sal\b/.test(lower);
  const isConSal = /\bcon\s+sal\b/.test(lower);
  const isCrunchy = /\b(crunchy|crocante)\b/.test(lower);
  const isCremosa = /\b(cremosa|suave|clasica)\b/.test(lower);
  const isSinTacc = /\bsin\s+tacc\b/.test(lower);
  const isOrganico = /\borganic[oa]\b/.test(lower);

  // 3. Extraer marca
  let brand: string | undefined = undefined;
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b)) {
      brand = b;
      break;
    }
  }

  return {
    size,
    variants: {
      isNeutro,
      isVirgen,
      isSinSal,
      isConSal,
      isCrunchy,
      isCremosa,
      isSinTacc,
      isOrganico,
    },
    brand,
  };
}

/**
 * 2. Reglas estrictas de Scoring (Marca, Tamaño y Variante):
 * - Bonus fuerte por tamaño idéntico o equivalente.
 * - Penalización severa si el resultado menciona otra medida distinta.
 * - Penalización severa si el resultado menciona una variante opuesta.
 * - Bonus fuerte por coincidencia de marca y dominio argentino confiable.
 */
function scoreResult(
  res: ImageCandidate,
  query: string,
  target: TargetAttributes
): number {
  let score = 0;
  const host = (res.hostPageUrl + ' ' + res.contentUrl).toLowerCase();
  const title = res.name.toLowerCase();
  const qTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  // A. Dominio de confianza argentino
  for (const domain of TRUSTED_DOMAINS) {
    if (host.includes(domain)) {
      score += 45;
      break;
    }
  }
  if (host.includes('.com.ar') || host.includes('.ar/')) {
    score += 20;
  }

  // B. Coincidencia de términos generales
  let matches = 0;
  for (const term of qTerms) {
    if (title.includes(term)) matches++;
  }
  score += matches * 8;

  // C. TAMAÑO Y MEDIDA (REGLA ESTRICTA)
  if (target.size) {
    const hasExactSize = target.size.equivalents.some(
      (eq) => title.includes(eq) || host.includes(eq)
    );

    if (hasExactSize) {
      score += 70; // BONUS FUERTE POR TAMAÑO EXACTO
    } else {
      // Buscar si el título de la imagen contiene OTRA medida distinta
      const candVol = title.match(/\b(\d+(?:[.,]\d+)?)\s*(ml|cc|lts?|litros?)\b/);
      const candWt = title.match(/\b(\d+(?:[.,]\d+)?)\s*(grs?|g|kgs?|kilos?)\b/);

      if (target.size.type === 'volume' && candVol && candVol[1] && candVol[2]) {
        const val = parseFloat(candVol[1].replace(',', '.'));
        const isLiter = candVol[2].startsWith('lt') || candVol[2].startsWith('l');
        const ml = isLiter ? val * 1000 : val;
        if (Math.abs(ml - target.size.value) > 10) {
          score -= 90; // PENALIZACIÓN FUERTE: Tamaño equivocado
        }
      } else if (target.size.type === 'weight' && candWt && candWt[1] && candWt[2]) {
        const val = parseFloat(candWt[1].replace(',', '.'));
        const isKg = candWt[2].startsWith('kg') || candWt[2].startsWith('kilo');
        const g = isKg ? val * 1000 : val;
        if (Math.abs(g - target.size.value) > 10) {
          score -= 90; // PENALIZACIÓN FUERTE: Peso equivocado
        }
      }
    }
  }

  // D. VARIANTES OPUESTAS (REGLA ESTRICTA)
  // Neutro vs Virgen
  if (target.variants.isNeutro) {
    if (title.includes('neutro')) score += 50;
    if (title.includes('virgen') || title.includes('extra virgen')) score -= 95;
  } else if (target.variants.isVirgen) {
    if (title.includes('virgen') || title.includes('extra virgen')) score += 50;
    if (title.includes('neutro')) score -= 95;
  }

  // Sin sal vs Con sal
  if (target.variants.isSinSal) {
    if (title.includes('sin sal')) score += 50;
    if (title.includes('con sal')) score -= 95;
  } else if (target.variants.isConSal) {
    if (title.includes('con sal')) score += 50;
    if (title.includes('sin sal')) score -= 95;
  }

  // Crunchy vs Cremosa
  if (target.variants.isCrunchy) {
    if (title.includes('crunchy') || title.includes('crocante')) score += 40;
    if (title.includes('cremosa') || title.includes('suave') || title.includes('clasica')) score -= 60;
  } else if (target.variants.isCremosa) {
    if (title.includes('cremosa') || title.includes('suave') || title.includes('clasica')) score += 40;
    if (title.includes('crunchy') || title.includes('crocante')) score -= 60;
  }

  // E. MARCA EXACTA
  if (target.brand) {
    if (title.includes(target.brand) || host.includes(target.brand.replace(/\s+/g, ''))) {
      score += 65; // BONUS FUERTE POR MARCA EXACTA
    } else {
      // Si el título contiene explícitamente otra marca conocida diferente, penalizar
      for (const b of KNOWN_BRANDS) {
        if (b !== target.brand && b.length > 3 && title.includes(b)) {
          score -= 75;
          break;
        }
      }
    }
  }

  // F. Penalización a packs mayoristas cuando buscamos unidad simple
  if (/\b(pack\s*x|combo\s*x|caja\s*cerrada)\b/i.test(title)) {
    score -= 30;
  }

  // G. Aspect ratio y dimensiones (cuadrado o vertical packaging)
  if (res.width && res.height) {
    const ratio = res.width / res.height;
    if (ratio >= 0.75 && ratio <= 1.25) {
      score += 20; // Cuadrado ideal
    } else if (ratio >= 0.5 && ratio <= 1.6) {
      score += 10;
    } else {
      score -= 25; // Banner alargado
    }

    if (res.width >= 400 && res.height >= 400) {
      score += 10;
    }
  }

  // H. Formatos inválidos o no deseados
  const lowerUrl = res.contentUrl.toLowerCase();
  if (lowerUrl.endsWith('.svg')) score -= 100;
  if (lowerUrl.endsWith('.gif')) score -= 30;

  return score;
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'");
}

export async function searchBingImagesAsync(
  productName: string,
  categoryName: string = ''
): Promise<{ url: string; title: string; source: string } | null> {
  // 1. Normalizar query
  const normalizedName = normalizeProductName(productName);
  const targetAttrs = extractTargetAttributes(normalizedName);

  const cleanCat = categoryName
    ? categoryName.replace(/^[0-9\s-]+/, '').toLowerCase().trim()
    : '';

  const terms = [normalizedName];
  if (cleanCat && !normalizedName.toLowerCase().includes(cleanCat)) {
    const firstWord = cleanCat.split(',')[0]?.trim();
    if (firstWord && !normalizedName.toLowerCase().includes(firstWord)) {
      terms.push(firstWord);
    }
  }
  terms.push('argentina dietetica');

  const searchQuery = terms.join(' ');
  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(
    searchQuery
  )}&first=1&count=25&mkt=es-AR&adlt=strict`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.warn(
        `⚠️ Error en respuesta de Bing (${response.status} ${response.statusText})`
      );
      return null;
    }

    const html = await response.text();
    const candidates: ImageCandidate[] = [];

    // Buscar atributos m="..." en los resultados de Bing
    const mRegex = /m="({[\s\S]*?})"/g;
    let match: RegExpExecArray | null;

    while ((match = mRegex.exec(html)) !== null) {
      const rawJson = match[1];
      if (!rawJson) continue;

      try {
        const parsed = JSON.parse(unescapeHtml(rawJson)) as BingParsedMetadata;
        if (!parsed.murl) continue;

        const width = parsed.w ?? parsed.mw ?? 800;
        const height = parsed.h ?? parsed.mh ?? 800;

        candidates.push({
          contentUrl: parsed.murl,
          hostPageUrl: parsed.purl || '',
          name: parsed.t || normalizedName,
          thumbnailUrl: parsed.turl || '',
          width,
          height,
          encodingFormat: 'jpeg',
        });
      } catch {
        // Ignorar si un bloque JSON puntual no parsea
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Ordenar con el sistema de scoring estricto
    candidates.sort(
      (a, b) =>
        scoreResult(b, normalizedName, targetAttrs) -
        scoreResult(a, normalizedName, targetAttrs)
    );

    const best = candidates[0];
    if (!best) return null;

    return {
      url: best.contentUrl,
      title: best.name,
      source: best.hostPageUrl,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`⚠️ Error buscando "${normalizedName}":`, message);
    return null;
  }
}

// Analizador de líneas CSV respetando comillas
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

async function main() {
  const args = process.argv.slice(2);
  const isFromScratch = args.includes('--desde-cero') || args.includes('--all');
  const forceRefresh = args.includes('--forzar');
  const limitIdx = args.indexOf('--limite');
  const limit =
    limitIdx !== -1 && args[limitIdx + 1]
      ? parseInt(args[limitIdx + 1]!, 10)
      : Infinity;
  const filterCatIdx = args.indexOf('--categoria');
  const filterCat =
    filterCatIdx !== -1 && args[filterCatIdx + 1]
      ? args[filterCatIdx + 1]!.toUpperCase()
      : null;

  console.log('===========================================================');
  console.log('🌿 DIETÉTICA NATURAL - BÚSQUEDA AUTOMÁTICA DE ALTA PRECISIÓN');
  console.log('===========================================================');

  // Leer archivo local original
  const csvPath = path.resolve(
    process.cwd(),
    'lista de precios dietetica  - Hoja 1.csv'
  );
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ No se encontró el archivo: ${csvPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(csvPath, 'utf8');
  const lines = rawContent.split(/\r?\n/);
  console.log(`📄 Filas totales en el archivo: ${lines.length}`);
  console.log(
    `⚙️ Modo: ${isFromScratch ? 'DESDE CERO (reemplazar todas)' : 'SOLO FALTANTES'}`
  );
  if (limit !== Infinity) console.log(`🎯 Límite de prueba: ${limit} productos`);
  if (filterCat) console.log(`📁 Filtrado por categoría: "${filterCat}"`);
  console.log('-----------------------------------------------------------');

  const cache = loadCache();
  const updatedLines: string[] = [];
  const columnEImages: string[] = [];

  let currentCategory = '';
  let processedCount = 0;
  let newFoundCount = 0;
  let cachedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (typeof rawLine !== 'string' || !rawLine.trim()) {
      updatedLines.push(rawLine || '');
      columnEImages.push('');
      continue;
    }

    const cells = parseCsvLine(rawLine);
    const colA = (cells[0] || '').trim();
    const colB = (cells[1] || '').trim();
    const colC = (cells[2] || '').trim();
    const colD = (cells[3] || '').trim();
    const colE = (cells[4] || '').trim();

    // Detección de encabezado de categoría
    if (colA && (colC.includes('$') || !colB)) {
      currentCategory = colA;
    }

    const isProductRow = colB && colC && colC.includes('$');

    if (!isProductRow) {
      updatedLines.push(rawLine);
      columnEImages.push(colE);
      continue;
    }

    // Comprobar filtro por categoría si fue solicitado
    if (filterCat && !currentCategory.toUpperCase().includes(filterCat)) {
      updatedLines.push(rawLine);
      columnEImages.push(colE);
      continue;
    }

    // ¿Necesita búsqueda?
    const needsSearch = isFromScratch || !colE || colE.trim() === '';

    if (!needsSearch || processedCount >= limit) {
      updatedLines.push(rawLine);
      columnEImages.push(colE);
      continue;
    }

    processedCount++;
    const cacheKey = colB.toLowerCase().trim();

    let finalImageUrl = colE;

    if (cache[cacheKey] && !forceRefresh) {
      finalImageUrl = cache[cacheKey].url;
      cachedCount++;
      if (cachedCount % 100 === 0 || cachedCount === 1) {
        console.log(
          `💾 [${processedCount}/${limit === Infinity ? '...' : limit}] Recuperados de caché: ${cachedCount} productos...`
        );
      }
    } else {
      console.log(
        `[${processedCount}/${limit === Infinity ? '...' : limit}] 🔍 Buscando en Bing: "${colB}"...`
      );
      const result = await searchBingImagesAsync(colB, currentCategory);

      if (result) {
        finalImageUrl = result.url;
        cache[cacheKey] = {
          url: result.url,
          title: result.title,
          source: result.source,
          foundAt: new Date().toISOString(),
        };
        newFoundCount++;
        console.log(`   ✅ Encontrada: ${result.title.slice(0, 65)}`);
        console.log(`   🔗 URL: ${result.url}`);
      } else {
        failedCount++;
        console.log(`   ⚠️ No se encontró imagen adecuada.`);
      }

      // Guardar caché cada 5 productos procesados
      if (processedCount % 5 === 0) {
        saveCache(cache);
      }

      // Pausa cortés entre peticiones (350ms)
      await new Promise((r) => setTimeout(r, 350));
    }

    // Armar fila actualizada manteniendo las 5 columnas exactas
    const updatedCells = [
      escapeCsvCell(colA),
      escapeCsvCell(colB),
      escapeCsvCell(colC),
      escapeCsvCell(colD),
      escapeCsvCell(finalImageUrl),
    ];
    updatedLines.push(updatedCells.join(','));
    columnEImages.push(finalImageUrl);

    // Guardar archivos cada 25 productos procesados para no perder progreso
    if (processedCount % 25 === 0) {
      fs.writeFileSync(OUTPUT_CSV, updatedLines.join('\n'), 'utf8');
      fs.writeFileSync(OUTPUT_COL_E, columnEImages.join('\n'), 'utf8');
    }
  }

  saveCache(cache);

  // Escribir archivo CSV completo
  fs.writeFileSync(OUTPUT_CSV, updatedLines.join('\n'), 'utf8');

  // Escribir archivo solo con columna E para pegar en Google Sheets
  fs.writeFileSync(OUTPUT_COL_E, columnEImages.join('\n'), 'utf8');

  console.log('\n===========================================================');
  console.log('🎉 PROCESAMIENTO FINALIZADO CON ÉXITO');
  console.log('===========================================================');
  console.log(`Total productos procesados en esta tanda: ${processedCount}`);
  console.log(`Nuevas imágenes encontradas: ${newFoundCount}`);
  console.log(`Imágenes recuperadas de caché: ${cachedCount}`);
  console.log(`Sin resultado: ${failedCount}`);
  console.log('\n📁 Archivos generados:');
  console.log(`1. Archivo CSV completo: ${OUTPUT_CSV}`);
  console.log(
    `2. Columna E sola (para copiar y pegar en Google Sheets): ${OUTPUT_COL_E}`
  );
  console.log('===========================================================\n');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
