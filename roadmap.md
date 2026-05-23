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
| Auth        | Supabase Auth                  |
| Wallet      | Generación propia (PKPass/JWT) |

---

## Fases

### Fase 0 — Setup de infraestructura

- [x] Crear proyecto Supabase y conectar pooler
- [x] Configurar Prisma con schema inicial (businesses, loyalty_cards, customers, stamps)
- [x] Crear seed con datos mockeados
- [x] Tests que validan datos mock (11 tests)
- [x] Tests de interfaz AuthService (9 tests)
- [x] Instalar Supabase client + helpers (@supabase/supabase-js, @supabase/ssr)
- [x] Crear capa portable de auth (lib/auth.ts, lib/auth-service.ts)
- [x] Crear proxy para proteger rutas (proxy.ts)
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

### Fase 1 — Backend real + API Routes

- [x] Crear API routes REST:
  - `POST /api/cards` — crear tarjeta de fidelidad
  - `GET /api/cards` — listar tarjetas
  - `GET /api/cards/:id` — detalle de tarjeta (público, para join flow)
  - `POST /api/stamps` — agregar sello / canjear recompensa
  - `GET /api/customers` — listar clientes (con búsqueda `?q=`)
  - `GET /api/dashboard/stats` — estadísticas del dashboard
- [x] Migrar dashboard home a datos reales desde Prisma
- [x] Migrar dashboard/cards a datos reales desde Prisma
- [x] Migrar dashboard/customers a datos reales desde Prisma
- [x] Conectar formulario crear tarjeta a `POST /api/cards`
- [x] Conectar join flow a `GET /api/cards/:id` (datos reales)
- [x] Conectar scan page a `GET /api/customers` y `POST /api/stamps`
- [x] Middleware de auth (middleware.ts) — protege dashboard, redirige login/signup
- [x] Proteger rutas del dashboard con session check
- [x] Crear Business automáticamente al registrarse

### Fase 2 — Dashboard completo

- [ ] Dashboard home con datos reales (stats, actividad reciente)
- [ ] CRUD de tarjetas de fidelidad
- [ ] Gestión de clientes con datos reales
- [ ] Generación de QR codes funcionales por tarjeta
- [ ] Personalización de marca (logo, color) persistente
- [ ] Configuración del negocio

### Fase 3 — Flujo de sellado (Scan)

- [ ] Implementar escáner QR real (cámara) en `/scan`
- [ ] Conectar escaneo con endpoint de sellado
- [ ] Feedback visual en tiempo real al empleado
- [ ] Mostrar cliente encontrado y progreso actual
- [ ] Botón "Agregar Sello" + "Canjear Recompensa" funcionales

### Fase 4 — Landing page + polish

- [ ] Conectar landing page a datos reales (precios, features)
- [ ] SEO básico (meta tags, Open Graph)
- [ ] Analíticas con Vercel Analytics
- [ ] Modo responsive completo
- [ ] Estados vacíos, carga, error en todas las páginas

### Post-MVP — Wallet Passes (Apple Wallet + Google Wallet)

> Las wallets se habilitarán después del MVP. El MVP funciona full en navegador como PWA.

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
- [ ] Probar pases en Android / emulador
- [ ] Generar certificado Apple Wallet (Pass Type ID + certificado de firma) — requiere Apple Developer Account ($99/año)
- [ ] Implementar lógica de actualización de passes (stamps update via push)
- [ ] Probar pases en dispositivo real / simulador
- [ ] Publicar en Wallet Console (Google) para quitar modo prueba

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

## Prioridades inmediatas (MVP)

> MVP: app web full en navegador como PWA. Wallets van post-MVP.

1. **Backend real** — API routes REST protegidas con Supabase Auth
2. **Dashboard con datos reales** — migrar de mock a Supabase
3. **Flujo de sellado (Scan)** — escáner QR + sellado + canje
4. **Landing page + polish** — responsive, SEO, estados vacío/carga/error
5. **PWA** — manifest, service worker, instalable
