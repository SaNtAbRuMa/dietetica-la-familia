export const siteConfig = {
  name: "Dietética La Familia",
  wordmark: "Dietética La Familia",
  subbrand: "Herboristería · Repostería · Cotillón",
  tagline: "Tiendas de alimentos saludables en Olavarría.",
  logo: "/images/logo-la-familia-real.png",
  description:
    "Tiendas de alimentos saludables en Olavarría. Alimentos naturales, frutos secos, semillas, repostería, cotillón y gran variedad Sin TACC. Sucursales Centro (Rivadavia 2581) y Urquiza (Av. Urquiza 1315).",
  locale: "es-AR",
  currency: "ARS",
  city: "Olavarría, Buenos Aires",
  hours: "Horario corrido",
  branches: [
    {
      id: "centro",
      name: "Sucursal Centro",
      address: "Rivadavia 2581 (esq. Cnel. Suárez)",
      shortAddress: "Rivadavia 2581",
      city: "Olavarría",
      badge: "Centro",
    },
    {
      id: "urquiza",
      name: "Sucursal Urquiza",
      address: "Av. Urquiza 1315 (esq. Rendón)",
      shortAddress: "Urquiza 1315",
      city: "Olavarría",
      badge: "Urquiza",
    },
  ],
  addresses: [
    "Rivadavia 2581 (esq. Cnel. Suárez) · Centro",
    "Av. Urquiza 1315 (esq. Rendón) · Urquiza",
  ],
  whatsappDisplay: "2284-322581",
  whatsappNumber: "5492284322581",
  whatsappUrl:
    "https://wa.me/5492284322581?text=Hola%20Diet%C3%A9tica%20La%20Familia!%20Tengo%20una%20consulta%20sobre%20la%20tienda%20online",
  instagramHandle: "dietetica.lafamilia",
  instagramUrl: "https://www.instagram.com/dietetica.lafamilia/",
  freeShippingThreshold: 20000,
  // Set only when a real public domain exists. Never invent a canonical URL.
  url: process.env.NEXT_PUBLIC_SITE_URL || "",
  commerceEnabled: true,
} as const;
