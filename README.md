# Dietética La Familia — Tienda Online Oficial

E-commerce de alimentos saludables, frutos secos, semillas, repostería, cotillón y productos Sin TACC para **Dietética La Familia** (Olavarría, Buenos Aires, Argentina).

Desplegado en producción: **[dietetica-la-familia.vercel.app](https://dietetica-la-familia.vercel.app/)**

---

## 🏬 Características Principales

- **Identidad y Sucursales**: Diseñado a medida para Dietética La Familia, destacando sus dos sucursales en Olavarría (Centro: Rivadavia 2581 y Urquiza: Av. Urquiza 1315).
- **Catálogo Escalable (>1.800 variantes)**: Búsqueda instantánea con normalización de acentos, filtrado dinámico por categorías, sin azúcar agregada, stock disponible y ordenación numérica por precio ARS.
- **Variantes y Medidas Reales**: Frutos secos y productos fraccionados en 100g, 250g, 500g, 1kg con control individual de SKU, precio y stock.
- **Carrito Persistente y Reactivo**: Carrito sincronizado en `localStorage`, drawer lateral con apertura fluida, validación de stock y actualización entre pestañas.
- **Medios de Pago Integrados (Argentina)**:
  - **Tarjeta de Débito y Crédito**: Formulario con validación en tiempo real de 16 dígitos, detección automática de marca (Visa, Mastercard, Cabal, Amex, Naranja X), cuotas e interfaz bancaria protegida con SSL.
  - **Mercado Pago Checkout Pro**: Creación de preferencias server-side y webhooks con verificación de firma HMAC-SHA256 (`x-signature`).
  - **Efectivo / Transferencia**: Cobro a coordinar en sucursal o contra entrega.
- **Panel de Control `/admin`**: Métricas clave en tiempo real, gestión visual de catálogo (creación, edición rápida de precios y stock), control de pedidos con cambio de estados y sincronización bidireccional con Google Sheets.
- **SEO y Performance**: App Router, Server Components, Schema.org `Product` JSON-LD, `sitemap.xml`, `robots.txt`, OpenGraph y optimización de imágenes con Next.js Image.

---

## 🛠️ Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, TypeScript (Strict mode con `exactOptionalPropertyTypes`)
- **Estilos**: Tailwind CSS 4, shadcn/ui (Base UI)
- **Pagos**: Mercado Pago Checkout Pro & pasarela integrada
- **Sincronización**: Google Sheets API / CSV Cache
- **Testing**: Node Test Runner con pruebas unitarias y de integración
- **Hosting**: Vercel

---

## 🚀 Puesta en Marcha Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 🧪 Verificación y Calidad

```bash
# Verificación estricta de TypeScript
npm run typecheck

# Linter de código
npm run lint

# Pruebas automatizadas (comercio, carrito, precios, firmas webhook)
npm test

# Compilación de producción
npm run build
```

---

## 🔒 Variables de Entorno

Consultar `.env.example` para los detalles de configuración:
- `NEXT_PUBLIC_SITE_URL`: Dominio oficial en producción (`https://dietetica-la-familia.vercel.app`).
- `ADMIN_PASSWORD`: Clave para acceder al panel de administración.
- `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET`: Credenciales de Mercado Pago.
- `GOOGLE_SHEET_ID` / `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Sincronización de catálogo y pedidos.
