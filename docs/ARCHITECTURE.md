# Koda Fidelity — Arquitectura

> Estado documentado desde `dev` como versión `1.2.0` en desarrollo. `main`
> representa la versión estable `1.1.0`; `1.1.x-patch` recibe correcciones de
> producción.

## Resumen

Koda Fidelity es un módulo SaaS de tarjetas de fidelidad digitales para negocios pequeños. El negocio crea tarjetas, comparte un QR o link de alta, y el cliente consulta sus tarjetas digitales desde web. El equipo del negocio puede sellar o canjear recompensas desde el dashboard.

La aplicación está construida con Next.js App Router. La UI vive en `app/` y `components/`; la persistencia de negocio usa Prisma sobre PostgreSQL administrado por Supabase; la autenticación y sesiones usan Supabase Auth con cookies SSR.

## Versiones y ramas

| Versión | Rama | Estado | Alcance |
| --- | --- | --- | --- |
| `1.0.0` | historial de `main` | MVP histórico | Dashboard base, tarjetas, clientes, QR, join flow, scan, portal cliente, Google OAuth/magic link, caducidad y guards. |
| `1.1.0` | `main` | Estable en producción | Multiusuario con roles, equipo, UX móvil, archivado/restauración, recompensas sorpresa, QR imprimible/PDF, personalización de tarjetas y polish responsive. |
| `1.1.x` | `1.1.x-patch` | Parches de producción | Hotfixes para `main`; cada versión publicada se sincroniza también hacia `dev`. |
| `1.2.0` | `dev` | En desarrollo | Siguiente ciclo de funcionalidades; Wallets, landing comercial, permisos avanzados, auditoría y mejoras de autenticación siguen pendientes. |

## Capas

| Capa | Ubicación | Responsabilidad |
| --- | --- | --- |
| Rutas y layouts | `app/` | App Router, páginas server/client, API Routes, metadata y OG images. |
| Componentes | `components/` | UI compartida, dashboard, auth, scanner y primitives de shadcn/ui. |
| Dominio y helpers | `lib/` | Auth service, Supabase clients, Prisma client, guards, OpenAPI, pases Wallet, helpers de tarjetas. |
| Datos | `prisma/` | Schema, migraciones y seed/mock data. |
| Operación | `scripts/` | Alta de clientes/usuarios, invitaciones, reset de contraseña y assets de pases. |
| Tests | `lib/__tests__/`, `components/**/__tests__/`, `e2e/` | Unit, integración, componentes y flujos Playwright. |
| Documentación | `docs/`, `plans/`, `roadmap.md` | Stack, auth, email, changelog, arquitectura, planes técnicos y roadmap. |

## Modelo de Datos

El modelo central está en `prisma/schema.prisma`.

- `Business`: negocio propietario de tarjetas. Guarda marca, logo, email, nickname, datos de contacto, `iconName` y `stampIconName`.
- `User`: colaborador autenticado del negocio. Pertenece a un `Business` y tiene rol `admin` o `sellador`.
- `LoyaltyCard`: tarjeta de fidelidad. Pertenece a un negocio, define recompensa, sellos requeridos, color, íconos, estado activo y caducidad.
- `Customer`: cliente inscrito a una tarjeta. Guarda email opcional, progreso de sellos, estado activo y referencias futuras a Wallet.
- `MilestoneReward`: recompensa sorpresa configurable para una tarjeta, asociada a un número de sello, probabilidad e ícono.
- `CustomerMilestoneClaim`: recompensa sorpresa obtenida por un cliente, conservada como historial independiente del ciclo actual.
- `StampLog`: historial de eventos de sellado/canje por cliente.

Las relaciones usan cascada desde `Business` hacia `User` y `LoyaltyCard`, y desde `LoyaltyCard` hacia `Customer`.

## Autenticación y Autorización

Supabase Auth maneja login, Google OAuth, magic links, recuperación de contraseña y sesiones SSR.

La aplicación no autoriza directamente por metadata editable del usuario. El acceso de negocio se resuelve en `lib/api-utils.ts` con `getBusinessFromSession()`, que toma el email autenticado desde Supabase y busca el `User` interno con su `Business`.

Los roles se aplican con `requireRole()`:

- `admin`: administra marca, configuración, tarjetas, clientes y equipo.
- `sellador`: accede a operación diaria como escaneo/sellado y datos necesarios del negocio.

`proxy.ts` protege rutas bajo `/dashboard`, excepto `/dashboard/my-cards`, que funciona como portal de cliente autenticado por magic link/OAuth.

## Rutas Principales

### Públicas

- `/`: landing pública.
- `/login` y `/signup`: autenticación. Signup puede quedar cerrado con `INVITE_ONLY=true`.
- `/join/[cardId]`: alta del cliente a una tarjeta.
- `/invite`: landing de bienvenida para colaboradores invitados.
- `/auth/callback`, `/auth/confirm`, `/auth/error`: callbacks y errores de Supabase Auth.

### Dashboard

- `/dashboard`: home del negocio.
- `/dashboard/cards`: tarjetas activas, filtros y acciones.
- `/dashboard/cards/archived`: tarjetas archivadas/restaurables.
- `/dashboard/cards/[id]`: detalle, QR inline y clientes de la tarjeta.
- `/dashboard/customers`: tabla de clientes sorteable y filtrable.
- `/dashboard/qr-codes`: QR por tarjeta.
- `/dashboard/scan`: escáner de sellado/canje.
- `/dashboard/branding`: marca, logo e íconos predeterminados.
- `/dashboard/settings`: datos del negocio.
- `/dashboard/team`: colaboradores y roles.
- `/dashboard/docs`: documentación interna en layout de dashboard.
- `/dashboard/my-cards`: portal de tarjetas del cliente.

### API

- `/api/cards`, `/api/cards/[id]`, `/api/cards/[id]/restore`
- `/api/customers`, `/api/customers/[id]`
- `/api/stamps`
- `/api/join`
- `/api/dashboard/stats`
- `/api/business`
- `/api/users`, `/api/users/[id]`
- `/api/my-cards/[customerId]`
- `/api/passes/apple/[cardId]`, `/api/passes/google/[cardId]`
- `/api/openapi`

## Flujos Clave

### Alta de negocio

Un usuario de negocio entra por invitación o signup permitido. El sistema crea o vincula `Business` y `User{role: admin}`. En flujos operativos se usa contraseña temporal con `must_change_password` para forzar cambio inicial.

### Invitación de colaborador

Un admin usa `/dashboard/team`. La API crea un usuario de Supabase Auth, crea el `User` interno con rol, marca `must_change_password`, y la UI genera credenciales/link para compartir. El teléfono para WhatsApp solo existe client-side.

### Alta de cliente

El cliente entra a `/join/[cardId]`. Si la tarjeta está activa y no vencida, se crea o consulta `Customer`; después el acceso a sus tarjetas se hace por Google OAuth o magic link hacia `/dashboard/my-cards`.

### Sellado y canje

El operador usa `/dashboard/scan`, ya sea por QR de cliente o búsqueda. `POST /api/stamps` valida sesión, negocio, tarjeta activa, caducidad y operación. Cada evento crea `StampLog` y actualiza `Customer.stamps`.

### Personalización de tarjeta

Las tarjetas pueden usar color, `iconName`, `stampIconName`, logo del negocio como ícono y preview normal/sellada. El negocio también define defaults desde Branding.

## Integraciones Externas

- Supabase Auth: sesiones, OAuth, magic links y password reset.
- Supabase PostgreSQL: base relacional vía Prisma.
- Supabase Storage: logos e imágenes usadas por marca/pases.
- Vercel: hosting y analytics.
- Cloudflare: DNS/WAF planeado.
- Apple Wallet / Google Wallet: endpoints existen, pero la UI pública los mantiene como "Próximamente" hasta completar certificados, pruebas y publicación.
- SMTP Zoho / `noreply@zivelo.dev`: invitaciones y templates personalizados.

## Seguridad

- Las API routes centralizan errores con `handleApiError()`.
- Las operaciones de negocio dependen de `getBusinessFromSession()` y no de parámetros enviados por cliente.
- Los permisos por rol se validan server-side.
- El portal de cliente y el dashboard comparten prefijo `/dashboard`, pero la protección de `proxy.ts` distingue `/dashboard/my-cards`.
- Hay deuda conocida por contraseña temporal hardcodeada; el plan de solución vive en `plans/002-random-temp-passwords.md`.

## Testing y Calidad

El proyecto usa Vitest para unit/integration/component tests y Playwright para E2E.

Scripts relevantes:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm e2e
```

El workflow de CI ejecuta instalación reproducible, generación de Prisma, lint,
typecheck y tests en `dev` y `main`.

`plans/` conserva planes técnicos ejecutados y pendientes; las deudas activas
más relevantes incluyen endurecer las rutas Wallet, reemplazar la contraseña
temporal compartida y preparar el siguiente ciclo de producto.

## Estado de Release

`1.1.0` vive en `main` como versión estable de producción. La rama
`1.1.x-patch` se utiliza para hotfixes y `dev` contiene el siguiente ciclo
`1.2.0`; no debe tratarse como una versión liberada.

Gates recomendados antes de liberar cambios de `dev` a una futura versión estable:

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- Validación manual de login admin, login sellador, invitación de equipo,
  sellado, archivado/restauración, recompensas sorpresa, QR/PDF y branding.
- Confirmar migraciones/schema en Supabase y revisar los cambios pendientes de
  Wallet antes de publicar una nueva versión estable.
