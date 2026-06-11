# Plan: Soporte Multiusuarios (admin / sellador)

> Rama: `feat/multi-user-support`
> Base: `dev`

---

## 1. Resumen

Agregar un modelo `User` que permita a un negocio tener múltiples colaboradores con dos roles:
- **admin** — control total del negocio (dueño)
- **sellador** — solo puede sellar/canjear, ver clientes y escanear QR

Actualmente el negocio es una entidad única identificada por `Business.email`. Con este cambio, varios usuarios de Supabase Auth pueden pertenecer a un mismo `Business` con distintos niveles de acceso.

---

## 2. Esquema de Base de Datos

### Nuevo modelo `User`

```prisma
enum Role {
  admin
  sellador
}

model User {
  id         String   @id @default(cuid())
  email      String   @unique
  name       String
  role       Role     @default(admin)
  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

`Business` se actualiza con la relación inversa:

```prisma
model Business {
  // ... campos existentes ...
  users User[]
}
```

> `Business.email` se conserva como email de contacto, pero **ya no se usa para autenticación**. La autenticación ahora se resuelve mediante `User.email`.

### Migración de datos existentes

Por cada `Business` existente, se crea un `User` con rol `admin`:

```sql
INSERT INTO "User" (id, email, name, role, "businessId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  b.email,
  b.name,
  'admin',
  b.id,
  b."createdAt",
  NOW()
FROM "Business" b;
```

### SQL de migración

```sql
CREATE TYPE "Role" AS ENUM ('admin', 'sellador');

CREATE TABLE "User" (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role "Role" NOT NULL DEFAULT 'admin',
    "businessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrar owners existentes como admin
INSERT INTO "User" (id, email, name, role, "businessId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  b.email,
  b.name,
  'admin',
  b.id,
  b."createdAt",
  NOW()
FROM "Business" b;
```

---

## 3. Flujo de Autenticación (Core Change)

### Antes (single-user)

```
Supabase Auth (user.email)
       ↓
Business.findUnique({ where: { email: user.email } })
       ↓
 business (único usuario)
```

### Después (multi-user)

```
Supabase Auth (user.email)
       ↓
User.findUnique({ where: { email: user.email }, include: { business: true } })
       ↓
{ business, user }  ← se retorna junto con el rol
```

### `getBusinessFromSession()` — nueva firma

```typescript
export type SessionBusiness = {
  business: Business
  user: {
    id: string
    email: string
    name: string
    role: Role
  }
}

export async function getBusinessFromSession(): Promise<SessionBusiness> {
  const supabase = await createClient()
  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  if (error || !authUser?.email) throw new UnauthorizedError()

  const userRecord = await prisma.user.findUnique({
    where: { email: authUser.email },
    include: { business: true },
  })
  if (!userRecord) throw new NotFoundError("User not found")

  return {
    business: userRecord.business,
    user: { id: userRecord.id, email: userRecord.email, name: userRecord.name, role: userRecord.role },
  }
}
```

### Nuevo helper `requireRole`

```typescript
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export function requireRole(user: SessionBusiness["user"], ...allowed: Role[]) {
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(`Role ${user.role} not allowed`)
  }
}
```

### `handleApiError` — agregar caso 403

```typescript
if (error instanceof ForbiddenError) {
  return NextResponse.json({ error: error.message }, { status: 403 })
}
```

---

## 4. Server Actions

### `checkBusinessEmail(email)` → nuevo lookup

Busca en `User` en vez de `Business`:

```typescript
export async function checkBusinessEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, business: { select: { nickname: true } } },
  })
  return { isBusiness: user !== null, nickname: user?.business?.nickname ?? null }
}
```

### `signup()` → crear `User` junto con `Business`

```typescript
const result = await prisma.business.create({
  data: {
    email,
    name,
    users: {
      create: { email, name, role: "admin" },
    },
  },
})
```

### `updatePassword()` → actualizar `User.nickname` (no `Business.nickname`)

**Cambio:** el nickname se mueve al `User`. Si el admin quiere poner un nickname personal, se guarda en `User`. Se agrega campo `User.nickname?` al schema.

```prisma
model User {
  // ...
  nickname String?
}
```

---

## 5. API Routes — Guards por Rol

### Rutas modificadas

| Ruta actual | Método | admin | sellador | Cambio |
|---|---|---|---|---|
| `/api/business` | GET | ✅ | ❌ | `requireRole(user, "admin")` |
| `/api/business` | PUT | ✅ | ❌ | `requireRole(user, "admin")` |
| `/api/cards` | GET | ✅ | ✅ | Bypass: sellador puede ver |
| `/api/cards` | POST | ✅ | ❌ | `requireRole(user, "admin")` |
| `/api/cards/[id]` | GET | público | público | Sin cambio |
| `/api/cards/[id]` | PUT | ✅ | ❌ | `requireRole(user, "admin")` |
| `/api/cards/[id]` | DELETE | ✅ | ❌ | `requireRole(user, "admin")` |
| `/api/stamps` | POST | ✅ | ✅ | Bypass: ambos roles |
| `/api/customers` | GET | ✅ | ✅ | Bypass: ambos roles |
| `/api/customers/[id]` | DELETE | ✅ | ❌ | `requireRole(user, "admin")` |
| `/api/dashboard/stats` | GET | ✅ | ✅ | Bypass: ambos roles |

### Nuevas rutas

| Ruta | Método | admin | Descripción |
|---|---|---|---|
| `/api/users` | GET | ✅ | Listar usuarios del negocio |
| `/api/users` | POST | ✅ | Invitar nuevo usuario |
| `/api/users/[id]` | PUT | ✅ | Cambiar rol de usuario |
| `/api/users/[id]` | DELETE | ✅ | Remover usuario del negocio |

#### `POST /api/users` — flujo de invitación

```typescript
export async function POST(request: NextRequest) {
  const { business, user } = await getBusinessFromSession()
  requireRole(user, "admin")

  const body = await request.json()
  // email, name, role

  // 1. Crear Supabase Auth user (via admin client)
  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name, must_change_password: true },
  })

  // 2. Crear User record en DB
  await prisma.user.create({
    data: { email, name, role, businessId: business.id },
  })

  // 3. Enviar email de invitación (reutilizar template existente)
  await sendInviteEmail({ email, name, businessName: business.name, temporaryPassword })
}
```

---

## 6. UI — Layout y Sidebar

### `app/dashboard/(main)/layout.tsx`

El layout resuelve el usuario vía `User` y pasa `role` a los componentes:

```tsx
const userRecord = await prisma.user.findUnique({
  where: { email: user.email },
  include: { business: { select: { name: true, brandColor: true, nickname: true } } },
})

if (!userRecord) redirect("/dashboard/forbidden")

return (
  <DashboardSidebar
    userEmail={user.email}
    businessName={userRecord.business.name}
    brandColor={userRecord.business.brandColor}
    nickname={userRecord.business.nickname ?? undefined}
    role={userRecord.role}
  />
  ...
)
```

### `components/dashboard/sidebar.tsx`

```typescript
interface DashboardSidebarProps {
  role: "admin" | "sellador"
}

const desktopNavigation = (role: string) => {
  const items = [
    { name: "Panel", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "sellador"] },
    { name: "Tarjetas de Lealtad", href: "/dashboard/cards", icon: CreditCard, roles: ["admin", "sellador"] },
    { name: "Clientes", href: "/dashboard/customers", icon: Users, roles: ["admin", "sellador"] },
    { name: "Códigos QR", href: "/dashboard/qr-codes", icon: QrCode, roles: ["admin", "sellador"] },
    { name: "Marca", href: "/dashboard/branding", icon: Palette, roles: ["admin"] },
    { name: "Configuración", href: "/dashboard/settings", icon: Settings, roles: ["admin"] },
    { name: "Equipo", href: "/dashboard/team", icon: UsersRound, roles: ["admin"] },
    { name: "Documentación", href: "/dashboard/docs", icon: BookOpen, roles: ["admin"] },
  ]
  return items.filter(item => item.roles.includes(role))
}
```

### Nuevo componente `UserRoleBadge`

Badge visual en sidebar/header que muestra el rol del usuario actual.

### `app/dashboard/(main)/team/page.tsx`

Página nueva (admin only) para gestionar el equipo:

- Tabla con usuarios del negocio (email, nombre, rol, fecha de invitación)
- Botón "Invitar miembro" → modal con: email, nombre, selector de rol
- Cada fila tiene acciones: cambiar rol (dropdown), remover (con confirmación)
- El admin dueño no puede removerse a sí mismo

---

## 7. Librerías

No se requieren librerías nuevas. Todo se implementa con el stack actual:

| Propósito | Librería | Ya en uso |
|---|---|---|
| ORM | Prisma v6 | ✅ |
| Auth | Supabase Auth + `@supabase/ssr` | ✅ |
| UI | shadcn/ui (new-york) + Tailwind CSS 4 + lucide-react | ✅ |
| Tests | Vitest + @testing-library/react | ✅ |
| CLI | `tsx` para scripts | ✅ |

Icono adicional de lucide-react (nuevo):
- `UsersRound` — para el nav "Equipo"
- `ShieldCheck`, `Stamp` — para badges de rol (opcional)
- `UserPlus`, `UserMinus`, `UserCog` — para acciones de equipo

---

## 8. Tests

### Unitarios (nuevos)

| Archivo | Qué testea |
|---|---|
| `lib/__tests__/role-guards.test.ts` | `ForbiddenError`, `requireRole()` |
| `lib/__tests__/user-auth.test.ts` | `getBusinessFromSession()` con User model mock |

### API routes (actualizar existentes)

Los tests que mockean `getBusinessFromSession()` deben actualizar el mock para devolver `{ business, user }` en vez de solo `business`.

### UI (nuevos)

| Archivo | Qué testea |
|---|---|
| `components/dashboard/__tests__/sidebar-roles.test.tsx` | Sidebar renderiza items según rol |
| `app/dashboard/__tests__/team-page.test.tsx` | Team page (admin) muestra lista, modal de invitación |

### E2E (opcional, post-impl)

- Invitación de usuario sellador
- Login como sellador → solo ve rutas permitidas
- Login como sellador → no puede crear tarjetas

---

## 9. Orden de Implementación

| Paso | Archivos | Estima |
|---|---|---|
| **1. Schema** → modelo User + migración + migración de datos | `prisma/schema.prisma`, migración SQL | ~15min |
| **2. Core auth** → `getBusinessFromSession` + `requireRole` + `ForbiddenError` | `lib/api-utils.ts` | ~15min |
| **3. Server actions** → `checkBusinessEmail`, `signup`, `updatePassword` | `lib/actions/auth.ts` | ~10min |
| **4. Script CLI** → `create-client.ts` crea User | `scripts/create-client.ts` | ~5min |
| **5. API routes** → role guards (8 archivos) | `app/api/business/`, `cards/`, `stamps/`, `customers/`, `dashboard/stats/` | ~20min |
| **6. API routes nuevas** → `/api/users` | `app/api/users/route.ts`, `app/api/users/[id]/route.ts` | ~20min |
| **7. UI Layout** → resolver User, pasar role | `app/dashboard/(main)/layout.tsx` | ~10min |
| **8. UI Sidebar** → items condicionales por rol | `components/dashboard/sidebar.tsx` | ~15min |
| **9. UI Header + ProfilePanel** → ocultar settings si sellador | `components/dashboard/header.tsx`, `profile-panel.tsx` | ~10min |
| **10. UI Team page** → gestión de usuarios | `app/dashboard/(main)/team/page.tsx` | ~30min |
| **11. Dashboard home** → resolver User (no Business) | `app/dashboard/(main)/page.tsx` | ~5min |
| **12. Tests** | varios `__tests__/` | ~30min |

**Total estimado:** ~3 horas

---

## 10. Matriz de Permisos Final

| Capacidad | admin | sellador |
|---|---|---|
| Ver dashboard (stats) | ✅ | ✅ |
| Ver lista de tarjetas | ✅ | ✅ |
| Crear tarjeta | ✅ | ❌ |
| Editar tarjeta | ✅ | ❌ |
| Eliminar tarjeta | ✅ | ❌ |
| Ver clientes (búsqueda manual) | ✅ | ✅ |
| Escanear QR + sellar | ✅ | ✅ |
| Canjear recompensa | ✅ | ✅ |
| Ver códigos QR | ✅ | ✅ |
| Editar marca/branding | ✅ | ❌ |
| Configuración del negocio | ✅ | ❌ |
| Eliminar clientes | ✅ | ❌ |
| Gestionar equipo (invitar/remover) | ✅ | ❌ |
| Ver documentación | ✅ | ❌ |
