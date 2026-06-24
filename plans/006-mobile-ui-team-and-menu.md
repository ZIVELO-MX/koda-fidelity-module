# Plan 006: Mejorar la UI mobile — menú de navegación completo y página de Equipo responsive

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5970571..HEAD -- components/dashboard/sidebar.tsx components/dashboard/mobile-settings-panel.tsx "components/dashboard/__tests__/sidebar-roles.test.tsx" "components/dashboard/__tests__/team-client-limit.test.tsx" "app/dashboard/(main)/team/team-client.tsx"`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / UI
- **Planned at**: commit `5970571`, 2026-06-11

## Why this matters

Two problemas de UX mobile pedidos explícitamente por el maintainer:

1. **El panel "Menú" del navbar mobile es un mapa incompleto de la app.** Hoy filtra deliberadamente cualquier destino que ya esté en las 4 pestañas inferiores, así que al abrir "Menú" un admin solo ve: Gestión → Códigos QR; Administración → Marca, Configuración, Equipo, Documentación. No aparecen Panel, Tarjetas, Clientes ni Escáner. El maintainer quiere que el panel muestre la navegación completa (Panel arriba; en Gestión: Tarjetas, Clientes, Códigos QR y el faltante Escáner), manteniendo el filtrado por rol.
2. **La página `/dashboard/team` se ve mal en mobile** (< 640px): cada fila de miembro colapsa en un stack vertical desalineado (selector de rol a ancho fijo a la izquierda, botón de eliminar flotando solo a la derecha en su propia línea); el formulario de invitación fuerza 2 columnas (Nombre/Correo) en un diálogo de ~340px; y el paso de formulario del diálogo no tiene scroll propio, así que en pantallas bajas los RoleCards (altos: 5+3 líneas de permisos) pueden empujar los botones fuera del `max-h-[90svh]` con `overflow-hidden`.

## Current state

Stack UI: Next.js 16 App Router, Tailwind CSS 4, shadcn/ui (new-york), lucide-react. Breakpoint relevante: `sm:` = 640px, `lg:` = 1024px (el navbar mobile aplica `lg:hidden`). El layout del dashboard ya compensa el navbar inferior con `pb-20 lg:pb-6` en `<main>` — no tocar.

### Navegación (workstream A)

- `components/dashboard/sidebar.tsx` — contiene el sidebar desktop, el bottom-nav mobile (pestañas: Panel, Tarjetas, [FAB Escáner], Clientes, Menú) y abre el panel. Piezas clave verificadas a commit 5970571:

```ts
// sidebar.tsx:51-71 — fuente única de grupos de navegación (desktop), con roles
const navGroups = [
  {
    label: "Gestión",
    roles: ["admin", "sellador"] as Role[],
    items: [
      { name: "Tarjetas de Lealtad", href: "/dashboard/cards", icon: CreditCard },
      { name: "Clientes", href: "/dashboard/customers", icon: Users },
      { name: "Códigos QR", href: "/dashboard/qr-codes", icon: QrCode },
    ],
  },
  {
    label: "Administración",
    roles: ["admin"] as Role[],
    items: [
      { name: "Marca", href: "/dashboard/branding", icon: Palette },
      { name: "Configuración", href: "/dashboard/settings", icon: Settings },
      { name: "Equipo", href: "/dashboard/team", icon: UserCog },
      { name: "Documentación", href: "/dashboard/docs", icon: BookOpen },
    ],
  },
]

// sidebar.tsx:73-79
const BOTTOM_NAV_HREFS = new Set([
  "/dashboard",
  "/dashboard/cards",
  "/dashboard/scan",
  "/dashboard/customers",
])

// sidebar.tsx:90-104 — AQUÍ se filtran los items del panel (esto es lo que cambia)
const visibleGroups = navGroups.filter((g) => g.roles.includes(role))
const moreNavGroups = navGroups
  .filter((g) => g.roles.includes(role))
  .map((g) => ({
    label: g.label,
    items: g.items.filter((item) => !BOTTOM_NAV_HREFS.has(item.href)),
  }))
  .filter((g) => g.items.length > 0)

const isScanActive = pathname === "/dashboard/scan"
const isMenuActive = moreNavGroups.some((g) =>
  g.items.some((item) => pathname.startsWith(item.href))
)
```

  Iconos ya importados en este archivo: `LayoutDashboard`, `CreditCard`, `Users`, `QrCode`, `Camera`, etc. (líneas 7-21).
- `components/dashboard/mobile-settings-panel.tsx` — overlay fullscreen que renderiza los `navGroups` que recibe como grid de 2 columnas, con tipos exportados `NavItem` / `NavGroup` (líneas 20-29). **No necesita cambios**: renderiza lo que le pasen.
- `components/dashboard/__tests__/sidebar-roles.test.tsx` — **asierta el comportamiento viejo** y debe actualizarse en este plan:

```ts
// sidebar-roles.test.tsx:30-31
const BOTTOM_NAV_HREFS = ["/dashboard", "/dashboard/cards", "/dashboard/customers", "/dashboard/scan"]

// :65-72 (admin) y :108-115 (sellador) — el test "does not include bottom-nav hrefs
// in panel items" itera BOTTOM_NAV_HREFS y espera que NO estén en el panel.
```

  El test mockea `MobileSettingsPanel` capturando props (`capturedProps`, líneas 12-18) y abre el menú con `fireEvent.click(screen.getByLabelText("Abrir menú"))` — ese harness se conserva tal cual.

### Página de equipo (workstream B)

- `app/dashboard/(main)/team/team-client.tsx` (621 líneas) — toda la UI de equipo. Los tres puntos a corregir, verificados a commit 5970571:

  **(B1) Fila de miembro** — `team-client.tsx:325`:

```tsx
<li key={member.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] items-center gap-3 sm:gap-4 px-5 py-4">
```

  En mobile (`grid-cols-1`) se apilan: bloque avatar+nombre, luego el `Select` de rol (trigger `h-8 w-36`, línea 361), luego `<div className="flex justify-end">` con el botón eliminar solo en su propia línea (líneas 384-395).

  **(B2) Grid del formulario de invitación** — `team-client.tsx:458`:

```tsx
<div className="grid grid-cols-2 gap-3">
```

  (2 columnas fijas para Nombre y Correo, incluso en mobile.)

  **(B3) Scroll del diálogo** — `team-client.tsx:443-447`: el `DialogContent` es `"sm:max-w-md max-h-[90svh] flex flex-col overflow-hidden"`. En el paso `credentials` el cuerpo sí tiene `overflow-y-auto` (línea 524), pero en el paso `form` el cuerpo es `<div className="space-y-5 py-2">` (línea 457) sin scroll — el contenido alto se corta.

- `components/dashboard/__tests__/team-client-limit.test.tsx` — tests existentes del límite de miembros; deben seguir pasando sin cambios.
- Convención de estilos: Tailwind utilities inline con `cn()` de `@/lib/utils`; variantes mobile-first (base = mobile, `sm:`/`lg:` para arriba). Ejemplar del patrón responsive en el mismo archivo: línea 289 (`<span className="hidden sm:inline">Invitar colaborador</span>`).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Tests enfocados | `pnpm exec vitest run components/dashboard/__tests__/sidebar-roles.test.tsx components/dashboard/__tests__/team-client-limit.test.tsx` | all pass |
| Suite completa | `pnpm test`         | all pass            |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |
| Verificación visual (opcional) | `pnpm dev` y abrir `http://localhost:3000/dashboard/team` a 375px de ancho | ver checklist en Step 6 |

## Suggested executor toolkit

- Si el entorno tiene el skill `verify` o `run` (lanzar la app y observar), úsalo en el Step 6 para la comprobación visual a 375px; si no, la verificación visual queda para el revisor humano y los gates son tsc/lint/tests.
- No uses el skill `frontend-design` para regenerar componentes enteros — los cambios son ajustes responsive quirúrgicos sobre componentes existentes que tienen tests.

## Scope

**In scope** (los únicos archivos que debes modificar):
- `components/dashboard/sidebar.tsx`
- `components/dashboard/__tests__/sidebar-roles.test.tsx`
- `app/dashboard/(main)/team/team-client.tsx`

**Out of scope** (NO tocar aunque parezca relacionado):
- `components/dashboard/mobile-settings-panel.tsx` — ya renderiza lo que recibe; no necesita cambios.
- El **sidebar desktop** (`visibleGroups` y su render, sidebar.tsx:118-231) — el maintainer pidió mobile; no agregues Escáner ni reordenes nada en desktop.
- `app/dashboard/(main)/layout.tsx` — el `pb-20` del main ya está bien.
- Extraer subcomponentes de `team-client.tsx` (es deuda conocida, plan futuro) — este plan solo ajusta clases/estructura responsive, no refactoriza.
- `app/dashboard/(main)/team/page.tsx` y cualquier ruta API.
- Los textos/labels existentes (nombres de secciones "Gestión"/"Administración", etc.) salvo lo especificado.

## Git workflow

- Branch desde `dev`: `feat/mobile-ui-team-and-menu`
- Commits convencionales en inglés, p. ej. `feat: complete mobile menu nav map and responsive team page`
- NO hagas push ni abras PR salvo instrucción del operador.

## Steps

### Step 1: Panel de menú completo en sidebar.tsx

En `components/dashboard/sidebar.tsx`, reemplaza el cálculo de `moreNavGroups` y de `isMenuActive` (líneas 90-104) por:

```ts
const visibleGroups = navGroups.filter((g) => g.roles.includes(role))

// Mobile "Menú" panel: complete navigation map (same role filtering as desktop).
// Bottom-nav tabs stay excluded only from the *active* highlight, not from the list.
const moreNavGroups = [
  {
    label: "General",
    items: [{ name: "Panel", href: "/dashboard", icon: LayoutDashboard }],
  },
  ...navGroups
    .filter((g) => g.roles.includes(role))
    .map((g) => ({
      label: g.label,
      items:
        g.label === "Gestión"
          ? [...g.items, { name: "Escáner", href: "/dashboard/scan", icon: Camera }]
          : [...g.items],
    })),
]

const isScanActive = pathname === "/dashboard/scan"
const isMenuActive = moreNavGroups.some((g) =>
  g.items.some(
    (item) => !BOTTOM_NAV_HREFS.has(item.href) && pathname.startsWith(item.href),
  ),
)
```

Notas:
- `BOTTOM_NAV_HREFS` (líneas 73-79) **se conserva** — ahora solo alimenta `isMenuActive`, para que el botón "Menú" no se ilumine a la vez que una pestaña inferior activa. Actualiza su comentario adyacente para reflejar este nuevo único uso.
- `LayoutDashboard` y `Camera` ya están importados.
- Resultado esperado del panel para **admin**: General → Panel; Gestión → Tarjetas de Lealtad, Clientes, Códigos QR, Escáner; Administración → Marca, Configuración, Equipo, Documentación. Para **sellador**: General → Panel; Gestión → (las mismas 4); sin Administración.

**Verify**: `npx tsc --noEmit` → exit 0. (Los tests de sidebar fallarán hasta el Step 2 — esperado.)

### Step 2: Actualizar los tests de sidebar al nuevo contrato

En `components/dashboard/__tests__/sidebar-roles.test.tsx`, conservando el harness (mocks y `openMobileMenu()`):

1. Elimina los dos tests `"does not include bottom-nav hrefs in panel items"` (bloques en líneas 65-72 y 108-115) y la constante `BOTTOM_NAV_HREFS` del test (líneas 30-31).
2. En su lugar, agrega en el describe del panel admin:

```ts
it("includes the complete navigation map (Panel, Tarjetas, Clientes, Escáner)", () => {
  const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
    g.items.map((i: any) => i.href)
  )
  for (const href of [
    "/dashboard", "/dashboard/cards", "/dashboard/customers",
    "/dashboard/scan", "/dashboard/qr-codes",
  ]) {
    expect(allHrefs).toContain(href)
  }
})

it("groups Panel under General and Escáner under Gestión", () => {
  const general = capturedProps.current.navGroups.find((g: any) => g.label === "General")
  const gestion = capturedProps.current.navGroups.find((g: any) => g.label === "Gestión")
  expect(general.items.map((i: any) => i.href)).toEqual(["/dashboard"])
  expect(gestion.items.map((i: any) => i.href)).toContain("/dashboard/scan")
})
```

3. En el describe del panel sellador, reemplaza su test eliminado por el mismo test de mapa completo (las 5 rutas de arriba) — y conserva intacto el test `"does NOT include admin-only items"` (líneas 117-124), que sigue siendo válido.

**Verify**: `pnpm exec vitest run components/dashboard/__tests__/sidebar-roles.test.tsx` → all pass.

### Step 3: Fila de miembro responsive en team-client.tsx

En `app/dashboard/(main)/team/team-client.tsx`, reestructura el `<li>` de cada miembro (líneas 325-396). Objetivo mobile: una tarjeta de dos líneas — fila 1: avatar + nombre/badges/correo con el botón eliminar a la derecha; fila 2: selector de rol a ancho completo. En `sm:` se mantiene el grid actual de 4 columnas. Estructura objetivo:

```tsx
<li
  key={member.id}
  className="px-4 py-4 sm:px-5 sm:grid sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center sm:gap-4"
>
  {/* Fila 1 en mobile / columna 1 en sm+ */}
  <div className="flex items-center gap-3 min-w-0">
    {/* ...avatar y bloque nombre/badges/email EXACTAMENTE como están (líneas 327-350)... */}

    {/* Eliminar — visible solo en mobile, al final de la fila 1 */}
    <Button
      variant="ghost"
      size="icon"
      className="sm:hidden h-8 w-8 ml-auto shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      disabled={isSelf}
      onClick={() => setRemoveTarget(member)}
      aria-label={`Eliminar a ${member.name}`}
    >
      <UserMinus className="h-4 w-4" />
    </Button>
  </div>

  {/* Email — solo sm+ (sin cambios) */}
  <p className="hidden sm:block text-sm text-muted-foreground truncate">{member.email}</p>

  {/* Selector de rol: full-width en mobile, compacto en sm+ */}
  <div className="mt-3 sm:mt-0">
    <Select ...sin cambios en props/contenido... >
      <SelectTrigger className="h-9 w-full sm:h-8 sm:w-36 text-xs gap-1.5">
        ...
      </SelectTrigger>
      ...
    </Select>
  </div>

  {/* Eliminar — columna sm+ (el botón actual, oculto en mobile) */}
  <div className="hidden sm:flex justify-end">
    {/* ...el Button actual de líneas 385-394 sin cambios... */}
  </div>
</li>
```

Notas: el botón eliminar queda renderizado dos veces con visibilidad excluyente (`sm:hidden` / `hidden sm:flex`) — duplicación deliberada para no romper el grid de sm+. El contenido interno de avatar/nombre/badges y del `SelectContent` no cambia.

**Verify**: `npx tsc --noEmit` → exit 0; `pnpm exec vitest run components/dashboard/__tests__/team-client-limit.test.tsx` → all pass.

### Step 4: Formulario de invitación en una columna en mobile

En el mismo archivo, línea 458, cambia:

```tsx
<div className="grid grid-cols-2 gap-3">
```

por:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 5: Scroll del paso de formulario del diálogo

En el mismo archivo:
1. Línea 457: el cuerpo del paso `form` pasa de `<div className="space-y-5 py-2">` a `<div className="space-y-5 py-2 overflow-y-auto flex-1 min-h-0">`.
2. Línea 513: el wrapper del paso `credentials` pasa de `<div className="flex flex-col gap-4">` a `<div className="flex flex-col gap-4 min-h-0">` (para que su hijo `overflow-y-auto` de la línea 524 pueda encoger dentro del `max-h-[90svh]`).

El `DialogContent` (línea 444) ya es `flex flex-col overflow-hidden` — no se toca.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 6: Suite completa + verificación visual

1. `pnpm test` → all pass. `pnpm lint` → exit 0.
2. **Si puedes lanzar la app** (`pnpm dev`, requiere `.env` con Supabase/DB — si no hay credenciales, salta este punto y déjalo anotado para el revisor): en viewport de 375×667 verifica con una cuenta admin:
   - Abrir "Menú" → se ven General (Panel), Gestión (Tarjetas de Lealtad, Clientes, Códigos QR, Escáner) y Administración (Marca, Configuración, Equipo, Documentación).
   - Estando en `/dashboard/cards`, la pestaña "Tarjetas" está activa y el botón "Menú" NO está resaltado; estando en `/dashboard/team`, "Menú" sí se resalta.
   - `/dashboard/team`: cada miembro se ve como tarjeta de dos líneas (eliminar arriba a la derecha, rol a ancho completo); "Invitar" abre el diálogo con Nombre y Correo apilados; con el teclado abierto o pantalla baja, el formulario hace scroll y los botones Cancelar/Crear siguen visibles.

**Verify**: `pnpm test` → exit 0 y checklist visual (si aplicó) sin fallos.

## Test plan

- Actualizar `components/dashboard/__tests__/sidebar-roles.test.tsx` (Step 2): nuevo contrato del panel — mapa completo por rol, agrupación General/Gestión, y conservar las exclusiones admin-only de sellador. Patrón estructural: el propio harness existente del archivo.
- `components/dashboard/__tests__/team-client-limit.test.tsx` debe pasar **sin modificaciones** — si necesita cambios, tu reestructura del `<li>` alteró algo más que clases (ver STOP conditions).
- Los cambios de los Steps 3-5 son de layout puro (clases Tailwind); su verificación es tsc + lint + tests existentes + checklist visual del Step 6.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n '"Escáner"' components/dashboard/sidebar.tsx` devuelve una coincidencia (en `moreNavGroups`, no en `navGroups`)
- [ ] `grep -n 'label: "General"' components/dashboard/sidebar.tsx` devuelve una coincidencia
- [ ] `grep -c "items.filter((item) => !BOTTOM_NAV_HREFS" components/dashboard/sidebar.tsx` devuelve 0 (ya no se filtran items del panel)
- [ ] `grep -n "grid grid-cols-1 sm:grid-cols-2 gap-3" "app/dashboard/(main)/team/team-client.tsx"` devuelve una coincidencia
- [ ] `grep -n "sm:hidden" "app/dashboard/(main)/team/team-client.tsx"` devuelve al menos una coincidencia (botón eliminar mobile)
- [ ] `pnpm exec vitest run components/dashboard/__tests__/sidebar-roles.test.tsx components/dashboard/__tests__/team-client-limit.test.tsx` → all pass
- [ ] `pnpm test` exit 0; `npx tsc --noEmit` exit 0; `pnpm lint` exit 0
- [ ] `git status` no muestra archivos modificados fuera de los 3 in-scope
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta (no improvises) si:

- Los extractos de "Current state" no coinciden con el código vivo (drift desde el commit 5970571) — en particular si `moreNavGroups` o el `<li>` de miembro ya cambiaron.
- `team-client-limit.test.tsx` falla tras el Step 3 y arreglarlo requeriría modificar ese test — significa que cambiaste estructura/semántica (no solo clases) y hay que revisar el enfoque.
- Te ves tentado a tocar el sidebar **desktop** (p. ej. agregar Escáner ahí) o a extraer subcomponentes de `team-client.tsx` — ambos están explícitamente fuera de alcance.
- El resaltado activo del botón "Menú" se comporta mal con la lógica especificada (p. ej. un nuevo conflicto de prefijos de ruta) y la corrección requiere cambiar `BOTTOM_NAV_HREFS` para desktop — reporta el caso concreto.

## Maintenance notes

- `moreNavGroups` ahora duplica conceptualmente "Panel" y "Escáner" como entradas mobile-only definidas inline. Si se agrega una ruta nueva al dashboard, hay que añadirla a `navGroups` (y aparecerá en desktop + panel mobile automáticamente); solo las entradas que no viven en `navGroups` (Panel, Escáner) se mantienen a mano en `moreNavGroups`.
- El botón eliminar duplicado (mobile/desktop) en la fila de miembro es deuda menor aceptada; cuando se haga la extracción de subcomponentes de `team-client.tsx` (deuda registrada en `plans/README.md`), unificarlo en un `TeamMemberRow`.
- Revisor: en el PR, mirar especialmente (a) que el panel de sellador no muestre items de Administración, (b) que el resaltado de "Menú" no se encienda en rutas del bottom-nav, y (c) capturas a 375px de `/dashboard/team` antes/después.
- Deferred deliberado: estado activo (highlight) del item actual dentro del panel de menú; paginación/virtualización de la lista de equipo (innecesario con límite de 3 miembros).
