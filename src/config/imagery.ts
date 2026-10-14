// Real food photography assets for store categories and products
export const imagery = {
  hero: "/images/hero.webp",
  breakfast: "/images/desayuno.webp",
};

const productPhotos: Record<string, string> = {
  almendras: "/images/categories/frutos-secos.webp",
  nueces: "/images/nueces.webp",
  castanas: "/images/castanas.webp",
  chia: "/images/chia.webp",
  girasol: "/images/chia.webp",
  granola: "/images/desayuno.webp",
  avena: "/images/desayuno.webp",
  lentejas: "/images/categories/legumbres.webp",
  legumbres: "/images/categories/legumbres.webp",
  harina: "/images/categories/harinas.webp",
  harinas: "/images/categories/harinas.webp",
  curcuma: "/images/categories/especias.webp",
  especias: "/images/categories/especias.webp",
  snack: "/images/categories/frutos-secos.webp",
  snacks: "/images/categories/frutos-secos.webp",
  "sin-tacc": "/images/categories/sin-tacc.webp",
  reposteria: "/images/categories/reposteria.webp",
  cotillon: "/images/categories/reposteria.webp",
};

export function productImage(key: string) {
  if (
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("/")
  ) {
    return key;
  }
  return productPhotos[key] ?? "/images/categories/frutos-secos.webp";
}
