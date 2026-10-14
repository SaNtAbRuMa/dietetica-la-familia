# Organización del código

- `app/`: rutas, layouts, metadata y Route Handlers de Next.js.
- `components/ui/`: componentes gestionados por shadcn/ui.
- `components/layout/`: estructura visual compartida del sitio.
- `config/`: configuración estática y segura para el cliente.
- `features/`: lógica y componentes agrupados por dominio (`catalog`, `cart`, `checkout`, `orders`, `admin`).
- `lib/`: utilidades independientes del dominio.
- `server/`: acceso a datos e integraciones exclusivas del servidor.
- `types/`: tipos compartidos entre dominios.

Los secretos y la validación autoritativa de precios y stock deben permanecer en `server/` o en Route Handlers/Server Actions.
