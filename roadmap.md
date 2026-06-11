# Koda Fidelity — Roadmap

> Basado en el análisis del proyecto, `docs/colors.md` y decisiones del equipo.

## Workflow

- **Solo PRs a `dev`** — nunca push directo a `main`
- Toda feature o fix va en una rama separada desde `dev` y pasa por code review antes de mergear
- `main` solo recibe merges desde `dev` para releases estables

---

## Stack Definido

| Capa        | Tecnología                     |
| ----------- | ------------------------------ |
| Frontend    | Next.js 16 + Tailwind CSS 4    |
| UI          | shadcn/ui (new-york)           |
| Deploy      | Vercel + Cloudflare (DNS/WAF)  |
| DB          | Supabase (PostgreSQL)          |
| ORM         | Prisma                         |
| Auth        | Supabase Auth (Google OAuth + magic link) |
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
- [x] Configurar variables de entorno en Vercel
- [x] Apuntar dominio desde Cloudflare a Vercel — DNS + SSL activo en `fidelity.zivelo.dev`; WAF/proxy de Cloudflare post-MVP

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

### Fase 6 — Mejora del MVP ✅ Completada

> El MVP base está completo (Fases 0-5). Esta fase agrupó mejoras técnicas y de UX
> sobre el producto existente, sin cambiar el alcance del MVP.

- [x] Reemplazar `html5-qrcode` por `@yudiel/react-qr-scanner` — estabiliza el escáner QR con la API nativa Barcode Detection + fallback ZXing
- [x] Agregar tests de componente para QRScanner (15 tests)
- [x] Desactivar cooldown de magic links durante beta del MVP (se re-activará post-MVP)
- [x] Mover my-cards a `/dashboard/my-cards` — ruta unificada para clientes y business
- [x] Refactor abstracción Supabase: centralizar imports en `lib/supabase-req-res.ts`
- [x] Login inteligente: detecta business email → password, customer email → magic link
- [x] Actividad reciente: limitado a 3 items en mobile
- [x] Google OAuth — reemplazar magic link como método principal de auth de clientes
- [x] Botón "Continuar con Google" en join flow, login, my-cards, dashboard/my-cards, página de error
- [x] Ruta /auth/callback para intercambio de código OAuth
- [x] Cooldown de magic links por email (2 min entre envíos)
- [x] Manejo de error rate limit con sugerencia de usar Google
- [x] `/dashboard/my-cards`: agrupar tarjetas por negocio con header colapsable
- [x] `/dashboard/my-cards`: barra de búsqueda (visible a partir de 5 tarjetas, filtra por negocio y nombre de tarjeta)
- [x] `/dashboard/my-cards`: mostrar nombre de tarjeta en el ítem del acordeón
- [x] Script `create-client` para crear cuentas de negocio con contraseña temporal desde CLI
- [x] Flujo de cambio de contraseña forzado al primer login (`must_change_password` en user metadata)
- [x] Login con email pre-llenado vía `?email=`: el formulario detecta que es negocio y salta directo al paso de contraseña
- [x] Template de invitación `docs/email-templates/invite.html` con credenciales, CTA y logo real
- [x] Script `send:invite` para envío manual de correos de invitación vía SMTP (Zoho Mail / `noreply@zivelo.dev`) con CC a equipo interno
- [x] Página 403 mejorada: botón "Cerrar sesión" + link de recuperación de contraseña
- [x] Recuperación de contraseña vía WhatsApp (MVP) — redirige a soporte con correo pre-llenado en el mensaje
- [x] Dashboard: sobreescribir `--primary` con el `brandColor` del negocio en el layout — sidebar activo, íconos, links y progress bars reflejan la marca del cliente
- [x] Botón "Sellar" en listado de tarjetas usa el `brandColor` de cada tarjeta individualmente
- [x] Escáner (`/dashboard/scan`): botón "Agregar Sello", stamps y confirmación usan el `brandColor` de la tarjeta del cliente
- [x] `GET /api/customers` incluye `cardBrandColor` en la respuesta
- [x] `docs/colors.md` documenta el naranja Koda (`oklch(0.705 0.191 41.116)` / `#f97316`), su equivalente hex y dónde aplica
- [x] Agregar campo `nickname` (apodo) al modelo `Business` — visible en sidebar, header y profile panel en lugar del email; editable desde `/settings` y capturado en el flujo de cambio de contraseña
- [x] Mover `/docs` a `/dashboard/docs` — ahora hereda el layout del dashboard (sidebar + header + nickname) y se eliminó el layout duplicado
- [x] Mejorar OG image de `/join/[cardId]` — fondo blanco, barra de color de marca, nombre del negocio en grande, titular "Obtén tu Fidelity Card", reward pill, puntos de sellos, badge "⚡ Por tiempo limitado" cuando hay caducidad; corregidos bugs de Satori (z-index, text nodes, backgroundImage) y tabla Prisma incorrecta
- [x] `/dashboard/my-cards`: botón de recargar — icono giratorio que recarga los datos del customer sin recargar la página

### Fase 7 — Caducidad de Tarjetas

> El schema ya tiene `expiresAt` en `LoyaltyCard`. Esta fase lo hace funcional de extremo a extremo.

#### 7.1 — UX de selección de fecha en `/dashboard/cards/new`

- [x] Reemplazar el input de fecha por `ExpirationPicker` con opciones rápidas: 1 semana, 1 mes, 3 meses, 6 meses, 1 año, Sin caducidad, Elegir fecha (muestra input de calendario nativo)
- [x] La opción activa se resalta visualmente
- [x] Tests de componente: 7 tests en `expiration-picker.test.tsx`

#### 7.2 — Lógica de caducidad (helpers)

- [x] `lib/card-utils.ts`: `isExpired`, `daysUntilExpiry`, `addDays`, `toDateInputValue`
- [x] Tests unitarios: 14 tests en `card-utils.test.ts`

#### 7.3 — Vista del customer (`/dashboard/my-cards`)

- [x] Banner amarillo cuando faltan ≤ 7 días; rojo cuando vence hoy/mañana
- [x] Badge en el accordion item (días restantes o "Vence hoy")
- [x] Tarjeta vencida: UI especial con mensaje cómico según sellos acumulados ("¡Casi lo logras!", "No alcanzaste los N sellos 🫠", "venció antes de comenzar 🤷")
- [x] Tarjetas vencidas agrupadas en acordeón colapsado "Tarjetas vencidas (N)" al fondo
- [x] Botón de recargar en el header con spinner

#### 7.4 — Vista del negocio (`/dashboard/cards` y `/dashboard/cards/[id]`)

- [x] Badge "Vencida" / "Activa" en el listado de `/dashboard/cards`
- [x] Filtro Todas / Activas / Vencidas con contador de vencidas en la pestaña
- [x] `DeleteExpiredCardButton`: botón de eliminar con confirmación que muestra N clientes afectados (solo visible en tarjetas vencidas)
- [x] En detalle (`/dashboard/cards/[id]`): badge "Vencida" junto al título + banner informativo con N clientes que no completaron sus sellos

#### 7.5 — Guards de caducidad (API)

- [x] `POST /api/stamps`: bloquea sellos si la tarjeta del cliente está vencida
- [x] `POST /api/join`: bloquea nuevos registros si la tarjeta está vencida
- [x] `GET /api/cards/[id]`: devuelve campo `expired` (boolean calculado en el servidor)
- [x] `/join/[cardId]`: muestra error antes del formulario cuando la tarjeta está vencida

#### 7.6 — Notificación pasiva (post-MVP, sin push) ✅ Completada

- [x] En el dashboard home (`/dashboard`): alerta si hay tarjetas próximas a vencer en ≤ 7 días
- [x] En `/dashboard/scan`: aviso al sellar si la tarjeta del cliente vence en ≤ 3 días

---

### Deuda Técnica — Magic Links por Email

El plan Free de Supabase limita el envío de emails a 30/hora por proyecto.
Con SMTP propio (`noreply@zivelo.dev`) este límite ya no aplica para los emails de magic link,
pero el rate limit interno de Supabase Auth (30 OTPs/hora por proyecto) sigue vigente.

**Mitigación actual:**
- Google OAuth como método principal (sin rate limits, 1 clic) — activo en producción
- Magic link queda como respaldo para quien no use Google
- `/join/[cardId]` muestra una sugerencia temporal para invitar a usar Google antes de la opción por email; se quitará eventualmente cuando el respaldo por correo deje de necesitar promoción contextual
- Cooldown de 2 min entre envíos por email (desactivado en beta)
- Mensajes de error claros que sugieren usar Google

**Solución definitiva (Post-MVP):**
- Migrar a Supabase Pro ($25/mes) para aumentar el límite de OTPs, o
- Evaluar provider alternativo (Auth0, Clerk) si el volumen lo justifica

### SMTP / Remitente personalizado

- [x] Configurar SMTP custom en Supabase
- [x] Remitente cambiado a `noreply@zivelo.dev` (ya no usa `@supabase.co`)
- [x] Template de magic link personalizado activo en Supabase Dashboard
- [x] Personalizar templates restantes — `confirmation.html`, `password-reset.html`, `email-change.html` en `docs/email-templates/`
- [x] Todos los templates incluyen soporte `@media (prefers-color-scheme: dark)` — ver paleta en la sección Post-MVP más abajo

### Deuda Técnica — Dominio de autenticación visible durante Google Auth

El flujo de Google Auth redirige brevemente al dominio técnico de Supabase
(`mgzledffujjnunawgymc.supabase.co`) durante el login. El flujo completo funciona correctamente
en producción (`fidelity.zivelo.dev`), pero el usuario ve momentáneamente un dominio ajeno.

**Causa:** Supabase Auth utiliza su propio dominio por defecto. Custom Domain requiere plan Pro + $10/mes.

**Impacto:** Bajo — no bloquea el login. Google Auth funciona en producción.

**Solución definitiva:** Configurar Custom Domain en Supabase Auth (Authentication > Settings >
Custom Domain). Requiere plan Pro y dominio propio verificado.

**Decisión:** Post-MVP. Se evaluará al escalar o cambiar de provider de auth.

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
    ✅ Completado.

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

## Estado del MVP

> **✅ MVP completo** — Fases 0–6 + guards de caducidad (Fase 7.5) completados y desplegados en `fidelity.zivelo.dev`.
> Lanzamiento controlado activo (`INVITE_ONLY=true`). Las secciones Post-MVP agrupan el trabajo futuro.

## Prioridades inmediatas

> MVP completo. Fases 0–6 y guards de caducidad (7.1–7.5) en producción.

### Pre-lanzamiento ✅ Completado

1.  **🟢 Alinear landing al MVP** — implementado en `fix/auditoria-mvp`.
2.  **🟢 Configurar dominio y entorno** — `fidelity.zivelo.dev` activo, DNS + SSL en Vercel, variables de entorno configuradas.
3.  **🟢 Cerrar gates técnicos** — `pnpm lint` funcional, `ignoreBuildErrors` removido de `next.config.mjs`, `pnpm test` y `pnpm exec tsc --noEmit` pasan sin errores.
4.  **🟢 Alinear documentación pública** — `README.md` actualizado; `docs/idea.md` eliminado (obsoleto).
5.  **🟢 SMTP personalizado** — remitente `noreply@zivelo.dev` activo en Supabase.
6.  **🟢 Template magic link** — `docs/email-templates/magic-link.html` activo en Supabase Dashboard.
7.  **🟢 Validar test plan** — `docs/test-plan-landing-mvp-alignment.md` creado y revisado.

### Verificaciones actuales

- [x] `pnpm exec tsc --noEmit` pasa sin errores.
- [x] `pnpm test` — 167 tests, 0 errores.
- [x] `pnpm lint` funcional (ESLint v9.39.4, solo warnings).
- [x] `ignoreBuildErrors` removido de `next.config.mjs`.
- [x] Vercel Analytics integrado en `app/layout.tsx`.
- [x] Deploy activo en `fidelity.zivelo.dev` con SSL.
- [x] Google OAuth funcional en producción (callbacks configurados en Supabase + Google Cloud Console).
- [x] SMTP propio activo — emails salen desde `noreply@zivelo.dev`.
- [x] Template magic link personalizado activo en Supabase Dashboard.
- [x] Flujo de invitación operativo — `create-client` + `send:invite` + login con email pre-llenado.
- [x] `INVITE_ONLY=true` en producción — lanzamiento controlado.
- [x] Landing alineada (site-config, page, mobile-nav, join layout, README).
- [x] `docs/idea.md` y `docs/deploy.md` eliminados (obsoletos).
- [x] QR scanner estabilizado (reemplazo de librería).
- [x] Cooldown de magic links desactivado (beta). Se re-activarán límites de tasa post-MVP.

> **A partir de ahora todo el desarrollo se hace en `dev`.** Las ramas de feature se crean desde `dev`, los PRs se mergean a `dev`, y `main` solo recibe merges desde `dev` para releases estables.

### Siguiente prioridad (inmediata después de MVP)

> Sistema multi-usuario con roles para que los negocios puedan invitar colaboradores.

- [ ] **Soporte multiusuarios** — modelo `User` vinculado a `Business` con dos roles:
  - `admin` (dueño, control total del negocio)
  - `sellador` (puede sellar/canjear tarjetas, ver clientes)
- [ ] Login con selección de negocio si aplica
- [ ] Pantalla de invitación — admin envía magic link con rol asignado
- [ ] Restringir acciones según rol en API routes y UI
- [ ] Migración de `Business.email` como owner implícito al nuevo modelo User

### Post-MVP — Infraestructura

- [ ] Activar Cloudflare WAF/proxy — el DNS ya apunta a Vercel sin proxy activo; activarlo añade DDoS protection y WAF
- [ ] Custom Domain en Supabase Auth — elimina el dominio técnico de Supabase visible durante Google OAuth
- [x] Templates de email personalizados — todos los 5 templates activos con logo real

### Post-MVP — Dark Mode

> La app aún no implementa dark mode oficialmente (Tailwind CSS maneja colores con variables CSS light-only).
> Sin embargo, los 5 templates de email ya responden a `@media (prefers-color-scheme: dark)` usando
> las clases `.em-*` con `!important` para sobrescribir estilos inline.

**Paleta de emails (stone de Tailwind):**

| Token      | Clase       | Light       | Dark        | Tailwind  |
| ---------- | ----------- | ----------- | ----------- | --------- |
| Fondo      | `.em-body`  | `#f5f5f4`   | `#0c0a09`   | stone-950 |
| Tarjeta    | `.em-card`  | `#ffffff`   | `#1c1917`   | stone-900 |
| Credenciales | `.em-creds` | `#f5f5f4` | `#292524`   | stone-800 |
| Heading    | `.em-h1`    | `#1c1917`   | `#fafaf9`   | stone-50  |
| Body text  | `.em-p`     | `#78716c`   | `#d6d3d1`   | stone-300 |
| Muted text | `.em-muted` | `#a8a29e`   | `#78716c`   | stone-500 |
| Divider    | `.em-divider` | `#e7e5e4` | `#44403c`   | stone-700 |
| Links      | `.em-link`  | `#a8a29e`   | `#78716c`   | stone-500 |
| CTA button | —           | `#f97316`   | `#f97316`   | orange-500 (sin cambio) |

**Al implementar dark mode en la app:**
- Extender `tailwind.config` con la clase `.dark` (selector strategy)
- Los emails **no requieren cambios** si se mantiene la paleta stone — la implementación ya está lista
- Si se cambian los colores base de la app, actualizar el bloque `@media (prefers-color-scheme: dark)`
  en los 5 templates (`docs/email-templates/*.html`)

### Post-MVP — UX

- [ ] `/login`: mejorar UI/UX del campo "ingresa tu contraseña" (padding, spacing, diseño del input)
- [ ] `/login`: aumentar padding/margin sobre el texto "Bienvenido de vuelta, [email]" para mejorar la respiración visual
- [ ] Foto de perfil para client y customer — subir/cambiar avatar similar al flujo de logo en tarjetas (Branding); mostrar en `ProfilePanel`, sidebar y header en lugar del círculo con inicial; campo `avatarUrl` en `Business` y en `Customer`

### Post-MVP — Magic Links

- [ ] Re-activar cooldown de magic links — restaurar límites de tasa con configuración por entorno
- [ ] Phone magic links — agregar `phone` a Customer + SMS auth

### Post-MVP — Wallet Passes

- [ ] Re-habilitar wallets (Apple y Google) cuando se requiera
- [ ] Probar pases en Android / emulador
- [ ] Generar certificado Apple Wallet (Pass Type ID + certificado de firma)
- [ ] Publicar en Wallet Console (Google) para quitar modo prueba

### Post-MVP — Usuarios y Permisos (ampliación)

> El MVP con roles admin/sellador está priorizado como siguiente hito.
> Esta sección amplía con funcionalidad futura post-lanzamiento.

- [ ] Roles adicionales: `viewer` (solo lectura de reportes)
- [ ] Registro de auditoría: quién hizo qué acción (selló, canjeó, editó)
- [ ] Dashboard de actividad por usuario
