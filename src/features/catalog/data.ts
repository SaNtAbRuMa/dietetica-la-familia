import type { Category, Product, ProductVariant } from "@/types/catalog";
import { productImage } from "@/config/imagery";

export const categories: Category[] = [
  {
    id: "frutos-secos",
    name: "Frutos secos",
    image: "almendras",
    description: "Crocantes, simples, irresistibles.",
  },
  {
    id: "semillas",
    name: "Semillas",
    image: "chia",
    description: "Pequeños ingredientes, muchas ideas.",
  },
  {
    id: "cereales-granolas",
    name: "Cereales y granolas",
    image: "granola",
    description: "Un buen comienzo para cada día.",
  },
  {
    id: "arroz-legumbres",
    name: "Arroz y legumbres",
    image: "lentejas",
    description: "La base de tus platos favoritos.",
  },
  {
    id: "harinas-pastas",
    name: "Harinas y pastas",
    image: "harina",
    description: "Para cocinar con tiempo y ganas.",
  },
  {
    id: "especias",
    name: "Especias",
    image: "curcuma",
    description: "Ese toque que cambia todo.",
  },
  {
    id: "snacks",
    name: "Snacks",
    image: "snack",
    description: "Algo rico para llevar con vos.",
  },
];

type Seed = {
  slug: string;
  name: string;
  category: string;
  image: string;
  description: string;
  short: string;
  ingredients: string;
  allergens: string;
  variants: readonly [string, number, number][];
  featured?: boolean;
  noAddedSugar?: boolean;
};

const seeds: Seed[] = [
  {
    slug: "almendras-naturales",
    name: "Almendras naturales",
    category: "frutos-secos",
    image: "almendras",
    short: "Enteras, crocantes y sin tostar",
    description:
      "Un clásico de tu despensa. Crocantes, suaves y listas para acompañar tus recetas o disfrutar a puñados.",
    ingredients: "Almendras naturales enteras.",
    allergens:
      "Contiene almendras. Puede contener otros frutos secos, maní y sésamo.",
    variants: [
      ["250 g", 4500, 18],
      ["500 g", 8200, 12],
      ["1 kg", 15000, 6],
    ],
    featured: true,
    noAddedSugar: true,
  },
  {
    slug: "nueces-mariposa",
    name: "Nueces mariposa",
    category: "frutos-secos",
    image: "nueces",
    short: "Mitades de sabor suave",
    description:
      "Mitades de nuez para sumar textura a ensaladas, budines y panes caseros. También son una buena compañía para una pausa a media tarde.",
    ingredients: "Nueces peladas.",
    allergens: "Contiene nueces. Puede contener almendras, maní y sésamo.",
    variants: [
      ["250 g", 3900, 16],
      ["500 g", 7200, 9],
      ["1 kg", 13400, 0],
    ],
    featured: true,
    noAddedSugar: true,
  },
  {
    slug: "castanas-de-caju",
    name: "Castañas de cajú",
    category: "frutos-secos",
    image: "castanas",
    short: "Naturales, sin sal agregada",
    description:
      "Textura suave y sabor delicado. Disfrutalas solas o usalas para preparar salsas, cremas y un montón de recetas caseras.",
    ingredients: "Castañas de cajú.",
    allergens:
      "Contiene castañas de cajú. Puede contener otros frutos secos y maní.",
    variants: [
      ["250 g", 5200, 10],
      ["500 g", 9800, 7],
    ],
    noAddedSugar: true,
  },
  {
    slug: "semillas-de-chia",
    name: "Semillas de chía",
    category: "semillas",
    image: "chia",
    short: "Para desayunos y recetas",
    description:
      "Pequeñas semillas para mezclar con yogur, sumar a una granola o preparar un pudín dejándolas hidratar durante unas horas.",
    ingredients: "Semillas de chía.",
    allergens: "Puede contener sésamo, frutos secos y maní.",
    variants: [
      ["200 g", 2400, 25],
      ["500 g", 5200, 14],
    ],
    featured: true,
    noAddedSugar: true,
  },
  {
    slug: "semillas-de-girasol",
    name: "Semillas de girasol",
    category: "semillas",
    image: "girasol",
    short: "Peladas y listas para usar",
    description:
      "Un toque crocante para tus ensaladas, panes o mezclas caseras. Podés usarlas naturales o tostarlas suavemente en una sartén.",
    ingredients: "Semillas de girasol peladas.",
    allergens: "Puede contener sésamo, frutos secos y maní.",
    variants: [
      ["250 g", 1800, 22],
      ["500 g", 3300, 14],
    ],
    noAddedSugar: true,
  },
  {
    slug: "granola-artesanal",
    name: "Granola artesanal",
    category: "cereales-granolas",
    image: "granola",
    short: "Avena, almendras, semillas y miel",
    description:
      "Una mezcla crocante de avena tostada, almendras, semillas y pasas, con el toque justo de miel. Tu compañera para desayunos sin apuro.",
    ingredients:
      "Avena, almendras, semillas de zapallo, pasas de uva, miel y aceite de girasol.",
    allergens:
      "Contiene avena (gluten) y almendras. Puede contener maní, leche y sésamo.",
    variants: [
      ["250 g", 3200, 20],
      ["500 g", 5800, 15],
      ["1 kg", 10800, 8],
    ],
    featured: true,
  },
  {
    slug: "avena-arrollada",
    name: "Avena arrollada",
    category: "cereales-granolas",
    image: "avena",
    short: "Copos tradicionales",
    description:
      "Un básico versátil para preparar porridge, galletitas o una granola a tu gusto. Copos de textura firme que se adaptan a tu cocina.",
    ingredients: "Avena arrollada.",
    allergens: "Contiene avena (gluten). Puede contener trigo y frutos secos.",
    variants: [
      ["500 g", 1900, 30],
      ["1 kg", 3400, 20],
    ],
    noAddedSugar: true,
  },
  {
    slug: "arroz-integral",
    name: "Arroz integral",
    category: "arroz-legumbres",
    image: "arroz",
    short: "Grano largo",
    description:
      "Granos firmes y de sabor delicado para acompañar verduras, preparar bowls o renovar tus guarniciones. Enjuagar antes de cocinar.",
    ingredients: "Arroz integral grano largo.",
    allergens:
      "Fraccionado en un espacio que también manipula trigo, sésamo y frutos secos.",
    variants: [
      ["500 g", 1600, 26],
      ["1 kg", 2900, 18],
    ],
    noAddedSugar: true,
  },
  {
    slug: "lentejas",
    name: "Lentejas",
    category: "arroz-legumbres",
    image: "lentejas",
    short: "Secas, para cocinar a tu manera",
    description:
      "Para ese guiso que reconforta, una ensalada tibia o unas hamburguesas caseras. Enjuagar y cocinar completamente antes de consumir.",
    ingredients: "Lentejas secas.",
    allergens:
      "Fraccionado en un espacio que también manipula trigo, sésamo y frutos secos.",
    variants: [
      ["500 g", 2100, 24],
      ["1 kg", 3900, 15],
    ],
    noAddedSugar: true,
  },
  {
    slug: "garbanzos",
    name: "Garbanzos",
    category: "arroz-legumbres",
    image: "garbanzos",
    short: "Ideales para tu hummus casero",
    description:
      "Un infaltable para preparar hummus, guisos o ensaladas. Remojar, descartar el agua y cocinar hasta que estén tiernos.",
    ingredients: "Garbanzos secos.",
    allergens:
      "Fraccionado en un espacio que también manipula trigo, sésamo y frutos secos.",
    variants: [
      ["500 g", 2200, 21],
      ["1 kg", 4100, 11],
    ],
    noAddedSugar: true,
  },
  {
    slug: "harina-integral",
    name: "Harina integral de trigo",
    category: "harinas-pastas",
    image: "harina",
    short: "Para panes y masas caseras",
    description:
      "Para poner las manos en la masa. Una harina de trigo integral que suma textura y sabor a tus panes, pizzas y tartas.",
    ingredients: "Harina integral de trigo.",
    allergens: "Contiene trigo (gluten). Puede contener avena y sésamo.",
    variants: [
      ["500 g", 1400, 17],
      ["1 kg", 2500, 10],
    ],
    noAddedSugar: true,
  },
  {
    slug: "tirabuzones-integrales",
    name: "Tirabuzones integrales",
    category: "harinas-pastas",
    image: "pasta",
    short: "Pasta seca de trigo",
    description:
      "Espirales que abrazan tu salsa favorita. Una opción para resolver un almuerzo rico con pocos ingredientes. Cocinar en abundante agua.",
    ingredients: "Harina integral de trigo y agua.",
    allergens: "Contiene trigo (gluten). Puede contener huevo.",
    variants: [["500 g", 2800, 13]],
    noAddedSugar: true,
  },
  {
    slug: "curcuma-molida",
    name: "Cúrcuma molida",
    category: "especias",
    image: "curcuma",
    short: "Color y sabor para tu cocina",
    description:
      "De color intenso y sabor terroso, acompaña arroces, sopas y verduras al horno. Empezá con una pizca y ajustá a tu gusto.",
    ingredients: "Cúrcuma molida.",
    allergens: "Puede contener mostaza y sésamo.",
    variants: [
      ["100 g", 1700, 16],
      ["250 g", 3700, 8],
    ],
    noAddedSugar: true,
  },
  {
    slug: "pimenton-dulce",
    name: "Pimentón dulce",
    category: "especias",
    image: "pimenton",
    short: "Aromático y de color intenso",
    description:
      "Ese toque de color para tus papas, guisos y aderezos. Guardalo lejos del calor para conservar su aroma.",
    ingredients: "Pimentón dulce molido.",
    allergens: "Puede contener mostaza y sésamo.",
    variants: [
      ["100 g", 1500, 0],
      ["250 g", 3200, 0],
    ],
    noAddedSugar: true,
  },
  {
    slug: "garbanzos-crocantes",
    name: "Garbanzos crocantes",
    category: "snacks",
    image: "snack",
    short: "Tostados con pimentón",
    description:
      "Un snack salado, crocante y con un toque de pimentón. Para llevar en la mochila o sumar a una picada diferente.",
    ingredients: "Garbanzos, aceite de girasol, pimentón dulce y sal.",
    allergens: "Puede contener trigo, maní y sésamo.",
    variants: [
      ["150 g", 2300, 18],
      ["300 g", 4200, 9],
    ],
    noAddedSugar: true,
  },
  {
    slug: "coco-en-escamas",
    name: "Coco en escamas",
    category: "snacks",
    image: "coco",
    short: "Sin azúcar agregada",
    description:
      "Escamas de coco de textura delicada para tus bowls, granolas y preparaciones dulces. El sabor propio del coco, sin azúcar agregada.",
    ingredients: "Coco deshidratado.",
    allergens: "Puede contener frutos secos y maní.",
    variants: [
      ["100 g", 1900, 20],
      ["250 g", 4100, 10],
    ],
    noAddedSugar: true,
  },
];

// Development-only fixtures: prices, stock, ingredients and allergens must be
// replaced and approved by the store before enabling real sales.
export const products: Product[] = seeds.map((seed, index) => ({
  id: seed.slug,
  slug: seed.slug,
  name: seed.name,
  categoryId: seed.category,
  description: seed.description,
  shortDescription: seed.short,
  ingredients: seed.ingredients,
  allergens: seed.allergens,
  storage:
    "Conservar en un recipiente cerrado, en un lugar fresco y seco, lejos de la luz directa. Consultá el vencimiento en el envase.",
  images: [
    {
      src: productImage(seed.image),
      alt: `Imagen ilustrativa de desarrollo: ${seed.name}`,
    },
  ],
  tags: seed.noAddedSugar ? ["sin-azucar-agregada"] : [],
  featured: seed.featured ?? false,
  isVisible: true,
  variants: seed.variants.map(
    ([size, price, stock], variantIndex): ProductVariant => ({
      id: `${seed.slug}-${size.replace(/\s/g, "")}`,
      sku: `RN-${String(index + 1).padStart(3, "0")}-${String(variantIndex + 1).padStart(2, "0")}`,
      size,
      price,
      stock,
    }),
  ),
}));
