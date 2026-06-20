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

## Versiones

| Versión | Rama | Estado | Fases incluidas |
| ------- | ---- | ------ | --------------- |
| `1.0.0` | `main` | ✅ MVP estable | Fases 0–7. Tarjetas, clientes, QR, join flow, scan, portal cliente, Google OAuth/magic link, caducidad y guards. |
| `1.1.0` | `dev` | 🟡 En cierre, no liberada | Fases 8–13. Multiusuario, equipo, UX móvil, operación, archivado/restauración, CI/plans, tabla de clientes compartida, ícono de sello y polish. |
| `1.2.0+` | futuras ramas desde `dev` | ⏳ Post-release | Wallets, landing comercial, permisos avanzados, auditoría y mejoras de auth. |

> `main` debe reflejar siempre la última versión estable. `dev` contiene la próxima versión candidata. En este momento los cambios acumulados en `dev` corresponden a `1.1.0`; está casi completa, pero aún requiere cierre de release antes de mergear a `main`.

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

### Fase 7 — Caducidad de Tarjetas ✅ Completada

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

### Deuda Técnica — Contraseña Temporal Hardcodeada

La constante `DEFAULT_PASSWORD = "Koda1234!"` existe en `app/api/users/route.ts:6` y en los scripts
`create-user`, `create-client`, `reset-password`, `send-invite`. Es la contraseña temporal asignada
a todo colaborador invitado, sin importar el negocio.

**Riesgo:** Quien conozca el email de un invitado puede acceder a su cuenta antes de que él lo haga,
hasta que complete el cambio de contraseña forzado (`must_change_password`). El valor ya está quemado
en el historial de git.

**Mitigación actual:** El login forzado a `/dashboard/update-password` reduce la ventana de riesgo si
el admin comparte las credenciales por WhatsApp de inmediato. El sistema está en lanzamiento controlado
(`INVITE_ONLY=true`), lo que limita el volumen de cuentas expuestas.

**Solución pendiente (`plans/002-random-temp-passwords.md`):**
- Crear `lib/temp-password.ts` con `generateTempPassword()` usando `crypto.randomBytes(12).toString("base64url")`
- Reemplazar la constante en la ruta API y los 4 scripts CLI
- Tras el deploy: rotar manualmente las cuentas existentes (la contraseña vieja está en git history)

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

## Estado por Versión

### `1.0.0` — MVP en `main` ✅ Estable

> **MVP completo** — Fases 0–7 completadas y desplegadas en `fidelity.zivelo.dev`.
> Lanzamiento controlado activo (`INVITE_ONLY=true`). Las secciones Post-MVP agrupan trabajo futuro, no bloqueos del MVP.

### `1.1.0` — Próxima versión en `dev` 🟡 Casi completa

> Incluye Fases 8–13. El desarrollo funcional está mayormente cerrado, pero la versión todavía no debe considerarse estable hasta pasar verificación final y merge a `main`.

**Pendiente para liberar `1.1.0`:**

- [ ] Ejecutar `pnpm typecheck`
- [ ] Ejecutar `pnpm test`
- [ ] Ejecutar `pnpm lint`
- [ ] Ejecutar `pnpm build`
- [ ] Validar manualmente login admin, login sellador, invitación de equipo, sellado/canje, archivado/restauración y branding con logo/ícono de sello
- [ ] Confirmar que schema/migraciones de Supabase estén aplicadas en el entorno objetivo
- [ ] Actualizar `docs/CHANGELOG.md` con resultado final de pruebas
- [ ] Mergear `dev` a `main` y taggear `v1.1.0`

**Features propuestas para `1.1.0` (pendientes de priorizar):**

- [ ] **Recompensas sorpresa** — al canjear, en lugar de recompensa fija, mostrar una selección aleatoria de 3 recompensas configuradas por el negocio; el cliente elige una. Incluir configuración en creación/edición de tarjeta, lógica de selección aleatoria en `POST /api/stamps`, y UI de selección en el scan o portal del cliente.

## Historial del MVP `1.0.0`

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
- [x] `pnpm test` — 238 tests, 0 errores (Fases 0–10).
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

## Alcance de `1.1.0`

### Fase 8 — Sistema Multi-Usuario ✅ Completada

> Mergeada a `dev` vía PR #79. Tests en `test/multi-user-roles` (PR pendiente).

- [x] **Modelo `User`** vinculado a `Business` con roles `admin` y `sellador`
- [x] `getBusinessFromSession()` resuelve vía `User` — soporta múltiples colaboradores por negocio
- [x] Guards de rol en todas las API routes (`requireRole`, `ForbiddenError`, 403)
- [x] `/api/users` — CRUD de colaboradores: listar, invitar, cambiar rol, eliminar
- [x] Invitación crea cuenta en Supabase Auth con contraseña temporal (`must_change_password`)
- [x] UI role-aware: sidebar, header, profile panel y mobile settings filtran según rol
- [x] `/dashboard/team` — gestión de equipo: tabla, modal invitar, cambio de rol, eliminar con confirmación
- [x] `prisma db push` aplicado + 9 negocios existentes migrados con usuario admin
- [x] `scripts/create-client.ts` actualizado — crea `User{admin}` junto con el `Business`
- [x] 191 tests, 0 errores de tipo

### Fase 9 — UX de Equipo ✅ Completada

> `feat/team-ux` mergeada a `dev`. Rama de tests separada si aplica.

- [x] **Tabla de equipo enriquecida** — avatar inicial, badge "tú" para el usuario actual, selector de rol con ícono
- [x] **Estado vacío con propuesta de valor** — comunica el beneficio de agregar colaboradores en lugar de mostrar solo un ícono vacío
- [x] **Explicador de permisos por rol** — sección permanente al fondo de la página con permisos y restricciones de cada rol
- [x] **Modal de invitación en 2 pasos**
  - Paso 1: nombre, email, selector de rol con tarjetas interactivas que muestran permisos
  - Paso 2: credenciales (correo + contraseña + link) con botones de copiar individual
- [x] **Entrega por WhatsApp** — campo de teléfono en paso 2 que genera `wa.me` URL con mensaje pre-redactado; número nunca se envía al servidor
- [x] **`/invite` — landing de bienvenida** — página intermedia (`app/invite/page.tsx`) que muestra el negocio y CTA de acceso, permite renderizado de OG antes del login
- [x] **`/invite/opengraph-image.tsx`** — OG 1200×630 con nombre del colaborador (si aplica), nombre del negocio y CTA; se muestra en preview de WhatsApp al compartir el link
- [x] 191 tests, 0 errores de tipo

### Fase 10 — UX del Dashboard y Herramientas de Operación ✅ Completada

> Ramas: `feat/mobile-navbar-redesign` (PR #82), `feat/reset-password-script` (PR #83), `feat/customers-sort-filter` (PR pendiente)

#### Mobile Navbar Redesign
- [x] **Bottom navbar mobile** — 5 tabs fijos: Panel, Tarjetas, [Escáner FAB central], Clientes, Menú
- [x] **Escáner FAB** — botón circular elevado en el centro, prominente, link a `/dashboard/scan`
- [x] **Desktop sidebar** — grupos colapsables "Gestión" y "Administración" con `Collapsible` de shadcn/ui
- [x] **Panel "Menú" mobile (v1)** — mostraba solo items NO disponibles en el bottom bar (QR + Administración para admin); ampliado a mapa completo en Fase 11
- [x] **Role-aware mobile** — sellador ve Gestión; admin ve Gestión + Administración

#### Scripts de Operación
- [x] **`pnpm reset:password`** — script CLI para resetear contraseña por email: genera nueva pass, marca `must_change_password`, cierra todas las sesiones, opcionalmente envía correo
- [x] **`--business`** en `create-client` — renombrado de `--name` a `--business` para mayor claridad
- [x] **Email modular** — `sendPasswordResetEmail()` como función exportable, reutiliza template `invite.html`

#### Dashboard UX
- [x] **Tabla Clientes sorteable** — columnas Cliente, Progreso, Registro ordenables via URL (`?sort=&order=`)
- [x] **Filtro por tarjeta** — pills de filtro en `/dashboard/customers` cuando hay más de una tarjeta activa
- [x] **Layout home** — Actividad Reciente movida debajo de Tarjetas (era sidebar igual nivel)
- [x] **Campo descripción** en dialog "Editar Tarjeta" — textarea con `resize-none`, max 200 chars; solo visible en dashboard
- [x] **"Ver tarjetas"** — botón en `/dashboard/customers` corregido a `/dashboard/cards`
- [x] **QR inline en detalle de tarjeta** — `CardQRInline` en `/dashboard/cards/[id]` antes de la tabla; preview 80px + link a QR codes
- [x] **Tabla sorteable en detalle de tarjeta** — `/dashboard/cards/[id]` reutiliza `CustomersTable` compartido, `showCardColumn={false}`
- [x] **Componente `CustomersTable` compartido** — extrae lógica de tabla, `SortField`, `SortOrder`, `buildSortLink`, `timeAgo` a `components/dashboard/customers-table.tsx`
- [x] 238 tests, 0 errores de tipo

### Fase 11 — UI Mobile: Menú Completo y Equipo Responsive ✅ Completada

> Rama: `feat/mobile-ui-team-and-menu` (PR pendiente)

#### Panel "Menú" mobile — mapa completo de navegación
- [x] **Panel "Menú" muestra todos los destinos** — grupo "General" (Panel), grupo "Gestión" (Tarjetas de Lealtad, Clientes, Códigos QR, Escáner), grupo "Administración" (admin: Marca, Configuración, Equipo, Documentación)
- [x] **"Escáner" agregado al panel** — visible en el panel de menú para acceso rápido, además del FAB central del bottom bar
- [x] **`isMenuActive` corregido** — el botón "Menú" no se ilumina cuando una pestaña inferior (Panel, Tarjetas, Clientes, Escáner) ya está activa; solo se resalta en rutas exclusivas del panel
- [x] **Role-aware** — sellador ve General + Gestión; admin ve los tres grupos

#### `/dashboard/team` — responsividad mobile
- [x] **Filas de miembro en mobile** — tarjeta de dos líneas: avatar + nombre/badges + botón eliminar (fila 1), selector de rol a ancho completo (fila 2)
- [x] **Formulario de invitación** — Nombre y Correo se apilan en una columna en mobile (`sm:` vuelve a 2 columnas)
- [x] **Scroll del diálogo** — el paso de formulario tiene `overflow-y-auto` propio dentro del `max-h-[90svh]`; los RoleCards altos no empujan los botones fuera de la pantalla
- [x] Tests de sidebar actualizados — reflejan el nuevo contrato del panel (mapa completo por rol)
- [x] 238 tests, 0 errores de tipo

### Fase 12 — UI Polish + Ícono de Sello ✅ Completada

> Ramas: `feat/ui-polish` (PR #90 → mergeado a `dev`), `hotfix/navbar-header-icons` (PR #93 → `dev`), `feat/branding-stamp-icon-picker` (PR #94 → `dev`)

#### Ícono de Sello y Vista Previa Sellada
- [x] Campo `stampIconName String?` en `LoyaltyCard` — permite un ícono distinto para las celdas selladas
- [x] `LoyaltyCardPreview` acepta prop `stampIconName` — renderiza ícono de sello o fallback al ícono de tarjeta
- [x] Vista previa "sellada" en `/cards/new` y dialog de edición — toggle Normal/Sellada + `IconPicker` secundario para el sello
- [x] Opción "Logo" en `IconPicker` — si el negocio tiene logo, aparece como opción de ícono de tarjeta/sello
- [x] Vista previa en `/dashboard/branding` usa `LoyaltyCardPreview` en lugar de preview custom

#### Hotfix — Bugs de Navegación (PR #93)

> **Causa raíz de los 3 bugs:**
>
> 1. **Iconos invisibles en el picker** — `next/image` en `icon-picker.tsx` inyecta `style="color: transparent"` en el `<img>` renderizado; ese valor se propagaba por `currentColor` a los `<svg>` Lucide cercanos, volviéndolos invisibles. Fix: revertir a `<img>` plano.
>
> 2. **Ícono y texto activo del navbar desaparecían** — `text-primary` aplicado en el `<Link>` padre dependía de herencia de CSS variables (`var(--primary)`) con Tailwind v4 `@theme inline`. En ciertos contextos la herencia se rompía. Fix: aplicar `text-primary`/`text-muted-foreground` directamente en cada `<icon>` y `<span>`.
>
> 3. **Logo propagado a toda la navegación** — al agregar la opción "Logo" en el picker de tarjetas, `logoUrl` se pasó erróneamente por toda la cadena layout → sidebar → header → profile panel. El logo del negocio es solo una opción de ícono de tarjeta; no debe aparecer en la UI de navegación.

---

### Fase 13 — Ícono Sello en Picker ✅ Completada

> Tarea simple: agregar el ícono `Stamp` de lucide-react como opción seleccionable en el `IconPicker` para íconos de carta y de sello.

- [x] Agregar `{ name: "stamp", label: "Sello", Icon: Stamp }` a `CARD_ICONS` en `lib/card-icons.ts`

---

### Pendientes UI para `1.1.0`

#### Dark mode de la app

> La app aún no implementa dark mode oficialmente (Tailwind CSS maneja colores con variables CSS light-only).
> Los 5 templates de email ya responden a `@media (prefers-color-scheme: dark)` usando las clases `.em-*` con `!important`.

- [ ] Extender la configuración de Tailwind con selector `.dark`
- [ ] Definir tokens dark para la app sin romper colores de marca por negocio
- [ ] Validar dashboard, login, join flow, my-cards, scan y componentes shadcn/ui en modo oscuro
- [ ] Si cambian los colores base, actualizar el bloque `@media (prefers-color-scheme: dark)` en `docs/email-templates/*.html`

#### Tema automático para tarjetas con colores claros

> Cuando el negocio configura un color de marca muy claro, el texto blanco y elementos semitransparentes de `LoyaltyCardPreview` quedan ilegibles. Se necesita un tema de tarjeta independiente del dark mode global.

- [ ] **Auto-detección**: calcular la luminancia relativa del `brandColor`; si supera un umbral (~0.7), aplicar automáticamente tema oscuro de tarjeta
- [ ] **Control manual**: radio button en el edit dialog (`Tema de tarjeta: Auto / Claro / Oscuro`)
- [ ] Guardar `LoyaltyCard.cardTheme String @default("auto")` con valores `"auto"`, `"light"`, `"dark"`
- [ ] `LoyaltyCardPreview` recibe prop `cardTheme?: "auto" | "light" | "dark"` y aplica la paleta correcta de foreground/background para texto y stamps

#### Avatar / foto de perfil

- [ ] Subir/cambiar avatar del negocio con flujo similar al logo en Branding
- [ ] Mostrar avatar en `ProfilePanel`, sidebar y header en lugar del círculo con inicial
- [ ] Agregar `avatarUrl` a `Business`
- [ ] Evaluar `avatarUrl` para `Customer` en portal de cliente

---

### Post-MVP — Landing Page

> Observaciones post-polish para aumentar conversión y credibilidad.

- [ ] **Testimoniales** — 3 quotes con nombre, tipo de negocio y calificación (tarjetas en fila horizontal)
- [ ] **Sección de números grandes** — bloque de fondo oscuro con 3 stats visibles (+N sellos, % retención, setup en X min)
- [ ] **FAQ** — 5 preguntas clave con `shadcn/Accordion` (¿necesitan app?, pricing, personalización, cancelación, seguridad QR)
- [ ] **Pricing beta más claro** — aunque sea "Gratis durante beta", mostrar features incluidas para reducir objeción

---

### Post-MVP — Infraestructura

- [ ] Activar Cloudflare WAF/proxy — el DNS ya apunta a Vercel sin proxy activo; activarlo añade DDoS protection y WAF
- [ ] Custom Domain en Supabase Auth — elimina el dominio técnico de Supabase visible durante Google OAuth
- [x] Templates de email personalizados — todos los 5 templates activos con logo real

### Post-MVP — UX

- [ ] `/login`: mejorar UI/UX del campo "ingresa tu contraseña" (padding, spacing, diseño del input)
- [ ] `/login`: aumentar padding/margin sobre el texto "Bienvenido de vuelta, [email]" para mejorar la respiración visual

### Post-MVP — Magic Links

- [ ] Re-activar cooldown de magic links — restaurar límites de tasa con configuración por entorno
- [ ] Phone magic links — agregar `phone` a Customer + SMS auth

### Post-MVP — Wallet Passes

- [ ] Re-habilitar wallets (Apple y Google) cuando se requiera
- [ ] Probar pases en Android / emulador
- [ ] Generar certificado Apple Wallet (Pass Type ID + certificado de firma)
- [ ] Publicar en Wallet Console (Google) para quitar modo prueba

### Post-MVP — QR Impresión y PDF

> La vista previa actual redirige al join flow en vivo y el botón Imprimir usa `window.print()` sin formato. Falta un PDF funcional que el negocio pueda imprimir y colocar en su local para que los clientes escaneen y se unan.

- [ ] **PDF con pdfslick** — generar PDF descargable con QR, nombre del negocio, logo, tarjeta de fidelidad, instrucciones y diseño profesional para imprimir
- [ ] **Vista previa del PDF** — mostrar el PDF embebido en la página en lugar de redirigir al join flow
- [ ] **Múltiples tamaños** — opción para descargar en tamaño tarjeta de crédito, media carta o carta completa
- [ ] **Personalización** — incluir nombre del negocio, logo, color de marca, nombre de la tarjeta, recompensa e instrucciones de uso
- [ ] **Imprimir desde PDF** — reemplazar `window.print()` con apertura del PDF para impresión nativa del navegador

### Post-MVP — Usuarios y Permisos (ampliación)

> `1.1.0` ya incorpora roles `admin` y `sellador`. Esta sección amplía permisos para versiones posteriores.

- [ ] Roles adicionales: `viewer` (solo lectura de reportes)
- [ ] Registro de auditoría: quién hizo qué acción (selló, canjeó, editó)
- [ ] Dashboard de actividad por usuario
