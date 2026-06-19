# Koda Fidelity — Arquitectura

> Estado documentado desde `dev` como versión candidata `1.1.0`. `main` representa el MVP `1.0.0`; los cambios actuales en `dev` todavía no tienen release estable.

## Resumen

Koda Fidelity es un módulo SaaS de tarjetas de fidelidad digitales para negocios pequeños. El negocio crea tarjetas, comparte un QR o link de alta, y el cliente consulta sus tarjetas digitales desde web. El equipo del negocio puede sellar o canjear recompensas desde el dashboard.

La aplicación está construida con Next.js App Router. La UI vive en `app/` y `components/`; la persistencia de negocio usa Prisma sobre PostgreSQL administrado por Supabase; la autenticación y sesiones usan Supabase Auth con cookies SSR.

## Versiones y ramas

| Versión | Rama | Estado | Alcance |
| --- | --- | --- | --- |
| `1.0.0` | `main` | MVP estable | Dashboard base, tarjetas, clientes, QR, join flow, scan, portal cliente, Google OAuth/magic link, caducidad y guards. |
| `1.1.0` | `dev` | En cierre, no liberada | Multiusuario con roles, equipo, UX móvil, scripts de operación, archivado/restauración, tabla de clientes compartida, CI/plans, selector de ícono de sello y polish. |
| `1.2.0+` | futuras ramas desde `dev` | Pendiente | Wallets reactivadas, dark mode, mejoras de landing, permisos avanzados, auditoría y avatar/foto de perfil. |

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

`dev` incluye workflow de CI y planes técnicos en `plans/` para robustecer rutas, concurrencia de sellado, soft delete/stats y contraseñas temporales aleatorias.

## Estado de Release

`1.0.0` vive en `main` como MVP estable. `1.1.0` vive en `dev` y está casi completo funcionalmente, pero debe cerrarse con verificación final antes de mergear a `main`.

Gates recomendados para liberar `1.1.0`:

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- Validación manual de login admin, login sellador, invitación de equipo, sellado, archivado/restauración y branding con logo/ícono de sello.
- Confirmar migraciones/schema en Supabase antes del merge a `main`.
