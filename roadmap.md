# Koda Fidelity — Roadmap

> Basado en el análisis del proyecto, `docs/colors.md` y decisiones del equipo.

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

### Fase 4 — Landing page + polish ✅ Completada

- [x] Conectar landing page a datos reales (precios, features)
- [x] SEO básico (meta tags, Open Graph, OG dinámico por negocio)
- [x] Modo responsive completo (hamburger menu, pricing scale, overflow, skeleton)
- [x] Estados vacíos, carga, error en todas las páginas (error boundary, skeleton, error+carga en qr/branding/settings, try/catch server, alert→toast)
- [x] Analíticas con Vercel Analytics (carga en producción desde `app/layout.tsx`)
- [x] Documentar alineación de landing con MVP vigente (`docs/landing-mvp-alignment.md`)
- [x] Crear test plan de aceptación para la alineación (`docs/test-plan-landing-mvp-alignment.md`)
- [x] Implementar landing alineada: QR/magic link activo, Wallet "Próximamente", pricing por definir y solo login público
- [x] Alinear `README.md` y metadatos públicos con el MVP actualizado
- [x] Reemplazar icono inline "K" por `short-logo.svg` en toda la UI (navbar, sidebar, login, scan, OG image)

### Fase 5 — Auditoría y correcciones ✅ Completada

> Correcciones basadas en auditoría `docs/auditoria-botones-y-datos-hardcodeados.md`

- [x] F-01: Endpoints Wallet aceptan customerId existente (botones siguen como "Próximamente")
- [x] F-02: GET /api/join?id= protegido con sesión de negocio
- [x] F-03: Corregido contrato data.customer → data.customers[0] en join flow
- [x] F-04: Extendido modelo Business con businessType, address, phone, website, instagram
- [x] F-05: Logo upload funcional (base64) con preview en Branding
- [x] F-06: Búsqueda de clientes conectada via searchParams (GET ?q=)
- [x] F-07: Validación por paso en wizard de creación de tarjeta
- [x] F-08 a F-15: Menús muertos eliminados, campana quitada, docs enlazado, QR fijo, DELETE con error
- [x] F-16/F-17: Footer y 404 con links reales (mailto en lugar de #)
- [x] F-19: aria-label en botones icono (sidebar móvil, scan)
- [x] F-20: Overlay móvil con role="dialog", Escape key, aria-modal
- [x] F-21: Settings email disabled (no editable desde API actual)
- [x] Búsqueda por nombre en tarjetas (GET ?q=) en /dashboard/cards
- [x] Botón "Sellar" por tarjeta que enlaza a /dashboard/scan?cardId=
- [x] Filtro por cardId en /dashboard/scan al venir desde tarjetas
- [x] Actividad Reciente en dashboard con scroll horizontal y tarjetas compactas
- [x] Template HTML personalizado para magic link de Supabase (docs/email-templates/magic-link.html)
- [x] Docs de configuración de correos electrónicos (docs/email-config.md)
- [x] Buscador de clientes en detalle de tarjeta (/dashboard/cards/[id]?q=)
- [x] Botón "Sellar/Canjear" por fila de cliente en detalle de tarjeta (StampButton con router.refresh)
- [x] Verificado: Next.js 16 usa proxy.ts (no middleware.ts) como convención nativa

### Pendiente (ocultado por no funcional)

> Items de la UI que se ocultaron porque el backend/servicio no está listo:

- Notificaciones push/email (toggles eliminados de Settings)
- Cambio de contraseña (botón eliminado de Settings)
- Menú de acciones en clientes y tarjetas (MoreVertical eliminado)
- Campana de notificaciones (eliminada del header)
- Google Wallet: requiere configuración en Google Pay & Wallet Console
- Apple Wallet: requiere Apple Developer Account ($99/año) + certificados

### Fase 6 — Mejora del MVP (En progreso)

> El MVP base está completo (Fases 0-5). Esta fase agrupa mejoras técnicas y de UX
> sobre el producto existente, sin cambiar el alcance del MVP.

- [x] Reemplazar `html5-qrcode` por `@yudiel/react-qr-scanner` — estabiliza el escáner QR con la API nativa Barcode Detection + fallback ZXing
- [x] Agregar tests de componente para QRScanner (15 tests)
- [x] Desactivar cooldown de magic links durante beta del MVP (se re-activará post-MVP)
- [x] Mover my-cards a `/dashboard/my-cards` — ruta unificada para clientes y business
- [x] Refactor abstracción Supabase: centralizar imports en `lib/supabase-req-res.ts`
- [x] Login inteligente: detecta business email → password, customer email → magic link
- [x] Actividad reciente: limitado a 3 items en mobile
- [ ] Agregar campo `phone` a Customer para SMS magic links (futuro)

### Post-MVP — SMTP / Remitente personalizado

- [ ] Configurar SMTP custom en Supabase (Resend, SendGrid, etc.)
- [ ] Cambiar remitente de `noreply@app.xxxxx.supabase.co` a `noreply@koda.app`
- [ ] Personalizar templates restantes (Confirmación, Cambio de contraseña, Cambio de email)

### Issues conocidos

- ~~**📷 Cámara en escáner QR no funciona**~~ ✅ Resuelto — se reemplazó `html5-qrcode` por `@yudiel/react-qr-scanner` (usa Barcode Detection API con fallback ZXing). Ver PR `fix/qr-scanner-library`.

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

### Definición vigente del MVP y solución de alineación

> La tarjeta digital web con QR, acceso mediante magic link y sellado desde el
> dashboard forman el MVP lanzable. Apple Wallet y Google Wallet permanecen
> fuera de alcance hasta su reactivación post-MVP. Pricing aún no está definido.

Para cerrar la discrepancia entre producto implementado y mensajes públicos:

1.  Implementar los cambios de contenido y navegación descritos en `docs/landing-mvp-alignment.md`.
    ✅ Completado en `fix/auditoria-mvp` (site-config.ts, page.tsx, mobile-nav, join layout, README).
2.  Mantener el preview de tarjeta como funcionalidad activa y etiquetar solo Wallet como "Próximamente".
    ✅ Ya se mantiene el preview en hero; Wallet permanece etiquetado "Próximamente".
3.  Sustituir planes, montos y CTAs comerciales por un bloque "Precios por definir".
    ✅ Pricing reemplazado por bloque informativo sin montos ni CTAs comerciales.
4.  Retirar CTAs públicos de registro mientras `INVITE_ONLY=true`; exponer solo inicio de sesión.
    ✅ CTA "Comenzar"/"Prueba Gratis" eliminados de nav, hero y mobile nav.
5.  Alinear `README.md`, metadata de landing y metadata de join al alcance vigente.
    ✅ README actualizado, metadata de join sin Wallet, description/social tags alineados.
6.  Ejecutar `docs/test-plan-landing-mvp-alignment.md` antes de considerar listo el lanzamiento.
    ⬜ Pendiente.

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

> MVP base funcional (Fases 0-5). Actualmente en Fase 6 — mejora del MVP.

### Pre-lanzamiento

1.  **🟢 Alinear landing al MVP** — implementado en `fix/auditoria-mvp`.
2.  **🔴 Configurar dominio y entorno** — Vercel + Cloudflare (DNS, SSL, variables de entorno).
3.  **🔴 Cerrar gates técnicos** — habilitar `pnpm lint`, remover `ignoreBuildErrors: true` y requerir `pnpm test`, `pnpm exec tsc --noEmit`, lint y build exitosos.
4.  **🟢 Alinear documentación pública** — `README.md` actualizado; `docs/idea.md` eliminado (obsoleto).
5.  **🟡 SMTP personalizado** — cambiar remitente de `@supabase.co` a `noreply@koda.app`.
6.  **🟢 Template magic link** — pegar `docs/email-templates/magic-link.html` en Supabase Dashboard.
7.  **🟡 Validar test plan** — ejecutar `docs/test-plan-landing-mvp-alignment.md` antes del lanzamiento.

### Verificaciones actuales

- [x] `pnpm exec tsc --noEmit` pasa sin errores.
- [x] Vercel Analytics ya está integrado en `app/layout.tsx`.
- [x] Landing alineada (site-config, page, mobile-nav, join layout, README).
- [x] `docs/idea.md` y `docs/deploy.md` eliminados (obsoletos).
- [x] QR scanner estabilizado (reemplazo de librería).
- [x] Tests de componente agregados para QRScanner.
- [x] Cooldown de magic links desactivado (beta). Se re-activarán límites de tasa post-MVP.
- [ ] `pnpm lint` debe repararse: el comando existe, pero ESLint no está instalado/configurado.
- [ ] El build debe dejar de omitir errores TypeScript en `next.config.mjs`.

### Post-MVP — Magic Links

- [ ] Re-activar cooldown de magic links — restaurar límites de tasa con configuración por entorno
- [ ] Phone magic links — agregar `phone` a Customer + SMS auth

### Post-MVP — Wallet Passes

- [ ] Re-habilitar wallets (Apple y Google) cuando se requiera
- [ ] Probar pases en Android / emulador
- [ ] Generar certificado Apple Wallet (Pass Type ID + certificado de firma)
- [ ] Publicar en Wallet Console (Google) para quitar modo prueba

### Post-MVP — Usuarios y Permisos

> Sistema multi-usuario con roles por negocio para que dueños puedan invitar
> colaboradores con diferentes niveles de acceso.

- [ ] Modelo `User` con email, nombre, rol y referencia a `Business`
- [ ] Roles: `admin` (dueño, control total), `editor` (crear/editar tarjetas, sellar), `viewer` (solo leer reportes)
- [ ] Login con selección de negocio si el usuario pertenece a más de uno
- [ ] Pantalla de invitación: dueño envía magic link con rol asignado
- [ ] Registro de auditoría: quién hizo qué acción (selló, canjeó, editó)
- [ ] Restringir acciones según rol en API routes y UI
- [ ] Migración de `Business.email` como owner implícito al nuevo modelo User
