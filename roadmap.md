# Koda Fidelity — Roadmap

> Basado en el análisis del proyecto, `docs/idea.md`, `docs/colors.md`, `docs/deploy.md` y decisiones del equipo.

## Workflow

- **Solo PRs a `main`** — nunca push directo
- Toda feature o fix va en una rama separada y pasa por code review antes de mergear

---

## Stack Definido

| Capa        | Tecnología                     |
| ----------- | ------------------------------ |
| Frontend    | Next.js 16 + Tailwind CSS 4    |
| UI          | shadcn/ui (new-york)           |
| Deploy      | Vercel + Cloudflare (DNS/WAF)  |
| DB          | Supabase (PostgreSQL)          |
| ORM         | Prisma                         |
| Auth        | Supabase Auth (magic link)     |
| Wallet      | Deshabilitado — "Próximamente" |

---

## Fases

### Fase 0 — Setup de infraestructura ✅ Completada

- [x] Crear proyecto Supabase y conectar pooler
- [x] Configurar Prisma con schema inicial (businesses, loyalty_cards, customers, stamps)
- [x] Crear seed con datos mockeados
- [x] Tests que validan datos mock (11 tests)
- [x] Tests de interfaz AuthService (9 tests)
- [x] Instalar Supabase client + helpers (@supabase/supabase-js, @supabase/ssr)
- [x] Crear capa portable de auth (lib/auth.ts, lib/auth-service.ts)
- [x] Crear proxy para proteger rutas (proxy.ts, renombrado de middleware.ts)
- [x] Migrar datos mock a DB real (seed ejecutado en Supabase)
- [x] Conectar Supabase Auth — server actions + /login + /signup pages
- [x] Página 404 personalizada con humor
- [x] Login modo invite-only (INVITE_ONLY=true, desbloqueable con env var)
- [x] Tests de config/invite-only (4 tests)
- [x] Signup dinámico: formulario real vs gate según INVITE_ONLY
- [x] E2E tests con Playwright: UI rendering, login, signup, logout, middleware
- [x] Script para crear test user en Supabase Auth (email_confirm=true)
- [ ] Configurar variables de entorno en Vercel
- [ ] Apuntar dominio desde Cloudflare a Vercel

### Fase 1 — Backend real + API Routes ✅ Completada

- [x] API routes REST:
  - `POST /api/cards` — crear tarjeta de fidelidad
  - `GET /api/cards` — listar tarjetas
  - `GET /api/cards/:id` — detalle de tarjeta (público, para join flow)
  - `PUT /api/cards/:id` — editar tarjeta
  - `POST /api/stamps` — agregar sello / canjear recompensa
  - `GET /api/customers` — listar clientes (con búsqueda `?q=`)
  - `GET /api/dashboard/stats` — estadísticas del dashboard
  - `POST /api/join` — crear cliente desde join flow
  - `GET /api/join` — lookup de cliente por id o email
- [x] Migrar dashboard home, cards y customers a datos reales (Prisma)
- [x] Conectar formulario crear tarjeta a `POST /api/cards`
- [x] Conectar join flow a `GET /api/cards/:id` (datos reales)
- [x] Conectar scan page a `GET /api/customers` y `POST /api/stamps`
- [x] Middleware de auth + protección de rutas dashboard
- [x] Crear Business automáticamente al registrarse
- [x] Tests: 56+ tests, 0 errores de tipo

### Fase 2 — Dashboard completo ✅ Completada

- [x] Página detalle de tarjeta (con QR, sellos, clientes asociados)
- [x] Editar tarjeta desde detalle (PUT /api/cards/:id)
- [x] Página QR codes con datos reales por tarjeta
- [x] Página Branding conectada a API (logo, color)
- [x] Página Settings conectada a API (editar negocio)
- [x] PWA: manifest.json + service worker + splash
- [x] Tests: 72 tests, 0 errores de tipo

### Fase 3 — Flujo de cliente (Join + Scan + Portal) ✅ Completada

- [x] AuthService.sendMagicLink() — abstracción portable
- [x] Cliente Supabase browser-side (lib/supabase-browser.ts)
- [x] `POST /api/join` — crear Customer con name + email + cardId
- [x] `GET /api/join` — lookup por id o email (email requiere sesión)
- [x] Join flow (`/join/[cardId]`): formulario nombre+email → magic link → QR
- [x] Cliente Customer.email en schema + migración
- [x] `/dashboard/scan`: escáner QR híbrido (cámara + búsqueda)
- [x] Scan: botón Agregar Sello + Canjear Recompensa
- [x] `/my-cards`: portal cliente con magic link + lista de tarjetas
- [x] `/auth/error`: manejo de otp_expired, rate_limit, errores genéricos
- [x] Landing page redirige a /auth/error con error_code de Supabase
- [x] Cooldown rate limit (detecta tiempo desde error de Supabase, fallback 90s)
- [x] Cooldown compartido entre páginas via localStorage
- [x] Google Wallet deshabilitado ("Próximamente")
- [x] Apple Wallet deshabilitado ("Próximamente")
- [x] `/dashboard/scan` sin nav bar (ruta fuera del layout dashboard)
- [x] Tests: 84 tests, 0 errores de tipo

### Fase 4 — Landing page + polish (Pendiente)

- [ ] Conectar landing page a datos reales (precios, features)
- [ ] SEO básico (meta tags, Open Graph)
- [ ] Analíticas con Vercel Analytics
- [ ] Modo responsive completo
- [ ] Estados vacíos, carga, error en todas las páginas
- [ ] Agregar campo `phone` a Customer para SMS magic links (futuro)

### Post-MVP — Wallet Passes (Deshabilitado)

> Las wallets se deshabilitaron temporalmente. Se muestran como "Próximamente" en el join flow.

- [x] Investigar formato PKPass (archivo .pkpass con manifest.json, pass.json, imágenes)
- [x] Crear endpoint `/api/passes/apple/:cardId` que genere y firme un PKPass
- [x] Integrar botón "Añadir a Apple Wallet" en el flujo `join/[cardId]`
- [x] Generar imágenes placeholder para el pase (icon, logo, strip, thumbnail)
- [x] Crear modo desarrollo (APPLE_WALLET_DEV_MODE=true) para pruebas sin certificado
- [x] Investigar Google Wallet API (JWT + issuer class/object)
- [x] Crear endpoint `/api/passes/google/:cardId` que genere JWT firmado
- [x] Implementar clase y objeto de loyalty card en Google Wallet
- [x] Integrar botón "Añadir a Google Wallet" en el flujo `join/[cardId]`
- [x] Configurar cuenta Google Pay & Wallet Console (Issuer ID + service account)
- [x] Mejorar diseño visual del pase (logo, hero image, secondary points, colores)
- [x] Migrar imágenes de pases a Supabase Storage (bucket `pass-images`) y remover binarios del repo
- [x] Deshabilitar Google Wallet ("Próximamente")
- [x] Deshabilitar Apple Wallet ("Próximamente")
- [ ] Probar pases en Android / emulador
- [ ] Generar certificado Apple Wallet (Pass Type ID + certificado de firma) — requiere Apple Developer Account ($99/año)
- [ ] Implementar lógica de actualización de passes (stamps update via push)
- [ ] Probar pases en dispositivo real / simulador
- [ ] Publicar en Wallet Console (Google) para quitar modo prueba
- [ ] Re-habilitar wallets cuando estén listas

---

## Notas técnicas

### Wallet passes (generación propia — free)

**Apple Wallet:**
- Formato: ZIP con `pass.json`, `manifest.json`, `signature`, imágenes
- Firma: Certificado Apple (requiere Apple Developer Account, $99/año)
- No hay costo por pass emitido

**Google Wallet:**
- Se usa Google Wallet API con JWT firmado
- Requiere cuenta Google Cloud + activar Google Wallet API
- No hay costo por pass emitido (límites de rate)

### Supabase + Prisma

```prisma
model Business {
  id            String   @id @default(cuid())
  name          String
  brandColor    String   @default("#ff6b35")
  logoUrl       String?
  email         String   @unique
  createdAt     DateTime @default(now())
  loyaltyCards  LoyaltyCard[]
}

model LoyaltyCard {
  id             String     @id @default(cuid())
  businessId     String
  business       Business   @relation(fields: [businessId], references: [id])
  name           String
  reward         String
  stampsRequired Int        @default(10)
  brandColor     String     @default("#ff6b35")
  expirationDays Int?
  description    String?
  createdAt      DateTime   @default(now())
  customers      Customer[]
}

model Customer {
  id            String       @id @default(cuid())
  name          String
  email         String?
  cardId        String
  card          LoyaltyCard  @relation(fields: [cardId], references: [id])
  stamps        Int          @default(0)
  applePassId   String?
  googlePassId  String?
  createdAt     DateTime     @default(now())
  stampsLog     StampLog[]
}

model StampLog {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  type       String   // "stamp" | "redeem"
  createdAt  DateTime @default(now())
}
```

---

## Prioridades inmediatas

> Fase 1-3 completadas. Próximo: Fase 4 (landing + polish).

1. **Landing page + polish** — responsive, SEO, estados vacío/carga/error
2. **Phone magic links** — agregar `phone` a Customer + SMS auth
3. **Wallet passes** — re-habilitar cuando se requiera
