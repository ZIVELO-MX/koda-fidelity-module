# Estado de Implementación: Sistema Multi-Usuario

> Rama: `feat/multi-user-support`
> Última sesión: 2026-06-10
> Estado: EN PROGRESO — aproximadamente 70% completo

---

## Cambios ya aplicados

### 1. `lib/api-utils.ts` ✅ COMPLETO
- Agregada clase `ForbiddenError`
- Agregado tipo `SessionBusiness`
- `getBusinessFromSession()` reescrita: resuelve vía `User` (no `Business.email`)
- Agregada función `requireRole(user, ...allowed)`
- `handleApiError()` maneja caso 403 (`ForbiddenError`)

### 2. API Routes — guards de rol ✅ COMPLETO
| Archivo | Cambio |
|---|---|
| `app/api/business/route.ts` | GET+PUT: `requireRole(user, "admin")` |
| `app/api/cards/route.ts` | GET: sin guard; POST: `requireRole(user, "admin")` |
| `app/api/cards/[id]/route.ts` | PUT+DELETE: `requireRole(user, "admin")` |
| `app/api/stamps/route.ts` | Sólo destructuring `{ business }` |
| `app/api/customers/route.ts` | Sólo destructuring `{ business }` |
| `app/api/customers/[id]/route.ts` | DELETE: `requireRole(user, "admin")` |
| `app/api/dashboard/stats/route.ts` | Sólo destructuring `{ business }` |
| `app/api/join/route.ts` | Sólo destructuring `{ business }` |

### 3. Nuevas rutas `/api/users` ✅ COMPLETO
- `app/api/users/route.ts`: GET (listar usuarios) + POST (invitar, crea auth + User en DB)
- `app/api/users/[id]/route.ts`: PUT (cambiar rol) + DELETE (eliminar de DB + Supabase Auth)
- Self-remove guard: admin no puede eliminarse a sí mismo

### 4. `lib/actions/auth.ts` ✅ COMPLETO
- `checkBusinessEmail()`: ahora busca en `User` (no `Business`)
- `signup()`: crea `Business` + `User{role:"admin"}` en una transacción
- `updatePassword()`: resuelve `businessId` vía `User` antes de actualizar nickname

### 5. `scripts/create-client.ts` ✅ COMPLETO
- Al crear negocio también crea `User{role:"admin"}`
- Si negocio ya existe y no tiene User, lo crea retroactivamente

### 6. `app/dashboard/(main)/layout.tsx` ✅ COMPLETO
- Resuelve sesión vía `User.findUnique` (no `Business.findUnique`)
- Pasa prop `role` a `DashboardSidebar` y `DashboardHeader`

### 7. `components/dashboard/sidebar.tsx` ✅ COMPLETO
- Acepta prop `role: Role`
- Nav items filtrados por rol (admin ve todo, sellador ve Panel/Tarjetas/Clientes/QR)
- Agregado item "Equipo" (`/dashboard/team`) — solo admin
- Badge "Sellador" visible en footer del sidebar cuando rol es sellador

### 8. `components/dashboard/header.tsx` ✅ COMPLETO
- Acepta prop `role: Role`
- Pasa `role` a `ProfilePanel`

---

## Pendiente de implementar

### 9. `components/dashboard/profile-panel.tsx` ⏳ PENDIENTE
- Agregar prop `role: Role` a la interfaz
- Ocultar enlace "Configuración" cuando `role === "sellador"`
- Cambio pequeño — ~10 líneas

### 10. `app/dashboard/(main)/team/page.tsx` ⏳ PENDIENTE (página principal)
Página Server Component que:
- Carga lista de usuarios del negocio via `/api/users` (o directo con Prisma desde el servidor)
- Renderiza tabla con columnas: nombre, email, rol (badge), fecha de invitación
- Botón "Invitar miembro" → abre modal (Client Component)
- Cada fila con acciones: cambiar rol (dropdown) + eliminar (con confirmación)
- Admin dueño no puede eliminarse a sí mismo

**Componentes necesarios dentro de la página:**
- `InviteUserModal` — formulario: email, nombre, selector de rol (admin/sellador)
- `ChangeRoleButton` — dropdown select para cambiar rol
- `RemoveUserButton` — botón con AlertDialog de confirmación

### 11. Migración de datos existentes ⏳ PENDIENTE (BD)
Ejecutar en Supabase SQL Editor para usuarios existentes que no tienen User record:

```sql
-- Crear tabla User si no existe (Prisma ya debería haberla creado con `prisma db push`)
-- Si ya se ejecutó `prisma db push` o la migración, sólo ejecutar el INSERT:

INSERT INTO "User" (id, email, name, role, "businessId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  b.email,
  b.name,
  'admin',
  b.id,
  b."createdAt",
  NOW()
FROM "Business" b
WHERE NOT EXISTS (
  SELECT 1 FROM "User" u WHERE u."businessId" = b.id
);
```

### 12. `prisma db push` ⏳ PENDIENTE (comando)
El schema ya tiene el modelo `User` y enum `Role` desde el commit anterior.
Ejecutar para aplicar el schema a la DB:
```bash
pnpm prisma db push
```

---

## Notas importantes

### Sobre console.log y datos sensibles
- En `app/api/users/route.ts` el endpoint `POST` devuelve `temporaryPassword` en la respuesta JSON.
  Esto es intencional (el admin la necesita para enviarla al colaborador) pero **no logear** en server.
- No hay `console.log` con emails ni passwords en el código nuevo. ✅

### Prop `role` en profile-panel
El `profile-panel.tsx` aún NO tiene el prop `role`. El `header.tsx` ya lo pasa pero
`ProfilePanel` lo ignorará hasta que se agregue la interfaz. No rompe nada — solo falta ocultar
el link de Configuración para selladores.

### Rutas protegidas en UI (middleware/proxy)
El `proxy.ts` solo protege `/dashboard/**` con autenticación general. Los guards de rol
están en las API routes. Para bloquear acceso directo a `/dashboard/team` desde un sellador
(sin pasar por API), se puede agregar una verificación en el Server Component de la página.

---

## Orden para retomar

1. Editar `components/dashboard/profile-panel.tsx` — agregar `role` prop, ocultar Settings
2. Crear `app/dashboard/(main)/team/page.tsx` — página principal + componentes cliente
3. Ejecutar `pnpm prisma db push` para aplicar schema
4. Ejecutar SQL de migración de datos en Supabase
5. Ejecutar `pnpm exec tsc --noEmit` para verificar tipos
6. Ejecutar `pnpm test` para verificar que tests existentes siguen pasando
