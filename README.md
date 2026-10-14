# Raíz Natural

Storefront de desarrollo para una dietética argentina. Next.js App Router, React, TypeScript estricto, Tailwind CSS 4, shadcn/ui (Base UI) y Zustand. **No acepta pedidos ni pagos reales.**

## Inicio

Node.js 24 recomendado. `npm ci`, `npm run dev` y abrir http://localhost:3000. No hacen falta credenciales para evaluar la tienda. `.env.example` queda preparado para integraciones futuras; no subir secretos al repositorio.

## Verificación

`npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, `npm run build`. Para probar producción: `npm run start`.

## Rutas

- `/`: portada completa, categorías, destacados y descubrimiento.
- `/productos`: búsqueda sin distinción de tildes, categorías, filtros de stock/azúcar y orden. Estado compartible por URL.
- `/productos/[slug]`: 16 productos, variantes, disponibilidad e información.
- `/carrito`: cantidades, variantes independientes, eliminación y subtotal; también hay un drawer global.
- `/checkout`: datos, entrega y revisión contra precios/stock del servidor. Los datos personales no se envían ni se persisten.
- `/api/checkout/review`: POST de identificadores y cantidades; rechaza datos inválidos, duplicados, precios enviados por el cliente y stock insuficiente. No crea pedidos, reservas ni pagos.
- `/nosotros`, `/informacion`: contenido y límites de esta versión.
- `/admin`: base pública informativa, sin datos privados, autenticación ficticia ni mutaciones.

## Arquitectura

`src/server/catalog.ts` implementa `CatalogRepository`; reemplazar ese adaptador por Supabase. Los fixtures están en `src/features/catalog/data.ts`, nunca dentro de componentes visuales. Precios y stock pertenecen a variantes. Importes de desarrollo son pesos ARS enteros.

Zustand usa una instancia por proveedor, hidrata después de montar y persiste únicamente IDs/cantidades en `raiz-natural:cart:v1`. Sanea datos, fusiona duplicados y limita stock; sincroniza pestañas. Los precios del navegador no son autoritativos.

Identidad: `src/config/site.ts` y tokens al inicio de `src/app/store.css`. Imágenes: `src/config/imagery.ts` y `public/images`. Cuatro fotos reutilizables, dos editoriales y un SVG liviano; todas ilustrativas. Los originales generados se conservan fuera del repositorio, sin generar imágenes nuevas. Reemplazar referencias por fotografía aprobada (y configurar `next/image` remotePatterns si se usa Storage).

La galería admite varias imágenes; los fixtures usan una por producto para evitar assets redundantes. Se usa `noindex` y no se publica Product JSON-LD ni ofertas comerciales ficticias mientras no haya catálogo real. La URL canónica de producto se activa solo con `NEXT_PUBLIC_SITE_URL` válido.

## Antes de vender

Conectar Supabase/PostgreSQL/Storage, autenticación administrativa y RLS. Validar imágenes, ingredientes, alérgenos, precios y stock. Implementar pedidos con snapshots históricos y reserva transaccional de stock; el endpoint de revisión no reserva nada. Crear preferencia Checkout Pro exclusivamente en servidor, validar webhooks firmados e idempotentes y nunca marcar pagado por una URL de retorno. Definir cobertura, costos, dirección, horarios y políticas. Los secretos permanecen en servidor. No hay SDK de Supabase ni Mercado Pago instalado todavía.
