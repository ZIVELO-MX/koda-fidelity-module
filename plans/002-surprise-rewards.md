# Recompensas Sorpresa — Plan de Implementación

> Inspirado en cofres/recompensas de Clash Royale: en lugar de una recompensa fija,
> el negocio configura un pool de recompensas posibles. Al canjear N sellos, el sistema
> elige 1 aleatoriamente y se la asigna al cliente. Además, el cliente recibe un **sello
> de regalo** (bonus stamp) como incentivo extra. Ese sello usa el ícono de sello
> configurado en la tarjeta (`stampIconName`), creando una distinción visual entre
> sellos normales y sellos de regalo.

---

## 1. Schema

### Nuevo modelo `Reward`

```prisma
model Reward {
  id        String       @id @default(cuid())
  cardId    String
  card      LoyaltyCard  @relation(fields: [cardId], references: [id], onDelete: Cascade)
  label     String       // texto visible: "Una cerveza gratis", "20% OFF", etc.
  emoji     String?      // opcional, para display con ícono
  weight    Int          @default(1) // peso para selección aleatoria (1-100)
  sortOrder Int          @default(0)
  createdAt DateTime     @default(now())
  claims    CustomerRewardClaim[]

  @@index([cardId])
}
```

### Campos nuevos en `LoyaltyCard`

```prisma
model LoyaltyCard {
  // ...existing fields...

  reward               String?   // ahora nullable — fallback cuando surpriseRewards=false
  surpriseRewardsEnabled Boolean  @default(false)
  rewards              Reward[]  // pool de recompensas cuando surpriseRewards=true
}
```

### Modelo `CustomerRewardClaim` (historial)

```prisma
model CustomerRewardClaim {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  rewardId   String
  reward     Reward   @relation(fields: [rewardId], references: [id])
  createdAt  DateTime @default(now())
  stampLogId String?  // referencia al StampLog del sello de regalo
  stampLog   StampLog? @relation(fields: [stampLogId], references: [id])

  @@index([customerId])
}
```

### Modificación a `StampLog`

```prisma
model StampLog {
  id         String          @id @default(cuid())
  customerId String
  customer   Customer        @relation(fields: [customerId], references: [id])
  type       String          // "stamp" | "redeem" | "gift"
  metadata   Json?           // metadata adicional (rewardClaimId, rewardLabel)
  createdAt  DateTime        @default(now())
}
```

Se agrega el campo `metadata Json?` y el tipo `"gift"` al uso existente.

### Migración

1. `ALTER TABLE LoyaltyCard ALTER COLUMN reward DROP NOT NULL;`
2. `ALTER TABLE LoyaltyCard ADD COLUMN surpriseRewardsEnabled BOOLEAN NOT NULL DEFAULT false;`
3. Crear tabla `Reward` con FK a `LoyaltyCard`
4. Crear tabla `CustomerRewardClaim` con FK a `Customer` y `Reward`
5. `ALTER TABLE StampLog ADD COLUMN metadata JSONB;`
6. Actualizar constraint de `StampLog.type` para aceptar `"gift"` (si hay enum check)

---

## 2. API

### 2.1 Crear/Editar Tarjeta — `POST /api/cards` / `PUT /api/cards/:id`

Aceptar nuevos campos:

```ts
// Body opcional cuando surpriseRewardsEnabled=true
{
  surpriseRewardsEnabled: boolean
  rewards?: { label: string; emoji?: string; weight?: number }[]
  // reward sigue siendo obligatorio cuando surpriseRewardsEnabled=false
  reward?: string  // ahora opcional
}
```

**Validaciones:**
- Si `surpriseRewardsEnabled=true`: `rewards` debe tener al menos 2 items
- Si `surpriseRewardsEnabled=false`: `reward` sigue siendo obligatorio
- Si se desactiva `surpriseRewardsEnabled` teniendo claims existentes: permitir (los claims históricos se conservan)

### 2.2 Obtener Tarjeta — `GET /api/cards/:id`

Incluir en respuesta:

```ts
{
  card: {
    // ...existing...
    surpriseRewardsEnabled: boolean
    rewards: { id: string; label: string; emoji: string | null; weight: number }[]
  }
}
```

### 2.3 Canje — `POST /api/stamps`

Lógica ampliada (se ejecuta después de la lógica de redeem existente):

```ts
// Cuando type === "redeem"
if (card.surpriseRewardsEnabled && card.rewards.length > 0) {
  // 1. Selección ponderada aleatoria
  const totalWeight = card.rewards.reduce((sum, r) => sum + r.weight, 0)
  const roll = Math.random() * totalWeight
  let acc = 0
  let selectedReward: Reward | null = null
  for (const reward of card.rewards) {
    acc += reward.weight
    if (roll <= acc) {
      selectedReward = reward
      break
    }
  }

  if (selectedReward) {
    // 2. Crear CustomerRewardClaim
    const claim = await prisma.customerRewardClaim.create({
      data: { customerId, rewardId: selectedReward.id },
    })

    // 3. Sello de regalo — sumar 1 stamp al customer + log tipo "gift"
    await prisma.customer.update({
      where: { id: customerId },
      data: { stamps: { increment: 1 } },
    })
    await prisma.stampLog.create({
      data: {
        customerId,
        type: "gift",
        metadata: { rewardClaimId: claim.id, rewardLabel: selectedReward.label },
      },
    })

    // Registrar en respuesta
  }
}
```

**Nuevo tipo en StampLog:** `type: "gift"` — se agrega al enum existente `"stamp" | "redeem" | "gift"`.

**Respuesta ampliada:**

```ts
{
  customer: { ... }
  rewardClaim?: {
    id: string
    label: string
    emoji: string | null
    giftStampAdded: true   // siempre true cuando hay rewardClaim
  }
}
```

### 2.4 Listar Claims — `GET /api/customers/:customerId/claims`

Endpoint nuevo para que el dashboard/portal del cliente muestre el historial de recompensas obtenidas.

---

## 3. UI — Configuración

### 3.1 Wizard Crear Tarjeta (`/dashboard/cards/new`)

Agregar un paso (o toggle dentro del paso actual de Recompensa):

```
┌─────────────────────────────────────┐
│  ¿Recompensa sorpresa?              │
│                                     │
│  [○] Recompensa fija                │
│       [___________] (input reward)  │
│                                     │
│  [●] Recompensa aleatoria           │
│       + Agregar posible recompensa  │
│       ┌─────────────────────────┐   │
│       │ 🍺 Una cerveza gratis   ✕ │   │
│       │ 🍕 Pizza mediana gratis ✕ │   │
│       │ 🧁 Postre de regalo     ✕ │   │
│       └─────────────────────────┘   │
│       [ + Agregar otra ]            │
│                                     │
│  (mínimo 2 recompensas requeridas)  │
└─────────────────────────────────────┘
```

**UX:**
- Radio group: "Fija" / "Aleatoria"
- Al seleccionar "Aleatoria", se muestra lista dinámica con input inline
- Cada item: input label + emoji picker (opcional, íconos predefinidos) + peso (opcional, slider)
- Botón "Agregar otra" añade fila vacía
- Botón ✕ elimina item
- Validación: mínimo 2 items
- Al cambiar de "Aleatoria" a "Fija", se descartan los items no guardados

### 3.2 Editar Tarjeta — Dialog

Misma UI que en creación, dentro del dialog de edición existente.

Si la tarjeta ya tiene `CustomerRewardClaim`:
- Al desactivar surprise rewards: confirmación "Hay N clientes con recompensas sorpresa. ¿Desactivar de todas formas?"
- No se borran los rewards existentes ni los claims históricos

---

## 4. UI — Cliente (Scan & Dashboard)

### 4.1 Scan al canjear

Cuando el admin/sellador hace clic en "Canjear":

1. POST /api/stamps con type="redeem"
2. Si `rewardClaim` viene en respuesta:
   - Modal/mensaje especial: "🎉 ¡El cliente ganó **[recompensa]**!" con emoji
   - Badge adicional: "⭐ +1 sello de regalo" con el ícono de sello de la tarjeta (`stampIconName`)
   - Animación tipo cofre/ticket (opcional)
3. Si no (recompensa fija): comportamiento actual

### 4.2 Dashboard del negocio — Detalle de tarjeta

En `/dashboard/cards/[id]`:
- Badge "Recompensa sorpresa activa" en el header de la tarjeta
- En la tabla de clientes: columna "Última recompensa" con el label + emoji
- En el perfil del cliente: historial de `CustomerRewardClaim`

### 4.3 Portal del cliente — `/my-cards` y `/dashboard/my-cards`

Hay dos rutas de portal cliente: `/my-cards` (standalone, acceso via magic link) y `/dashboard/my-cards` (dentro del dashboard del negocio, usado por clientes que también son staff). Ambas comparten el mismo componente de tarjeta.

#### 4.3.1 Card detail — sección "Tus Recompensas"

Dentro del acordeón/expansor de cada tarjeta:

```
┌──────────────────────────────────────────┐
│  ☕ Café Zivelo              🟡 8/10     │
│  ─────────────────────────────────────── │
│  🎁 Tus Recompensas Obtenidas           │
│                                          │
│  🍺 Cerveza gratis        — 15/05/2026  │
│  🧁 Poste de regalo       — 02/04/2026  │
│  🍕 Pizza mediana         — 21/03/2026  │
│                                          │
│  [Ver todas] si hay más de 3            │
└──────────────────────────────────────────┘
```

- Cada claim muestra: emoji (si existe) + label + fecha de obtención + badge "⭐ +1" (indicando el sello de regalo)
- El badge del sello de regalo usa el `stampIconName` de la tarjeta (si está configurado)
- Ordenado del más reciente al más antiguo
- Si la tarjeta tiene `surpriseRewardsEnabled`, mostrar badge junto al título: "🎲 Recompensa aleatoria"

#### 4.3.2 Modal de revelación (justo después del canje)

Cuando el cliente canjea en el scan (o se confirma vía magic link):

1. La pantalla de "✅ ¡Recompensa canjeada!" se reemplaza por una animación tipo cofre/ticket:

```
┌──────────────────────────────────┐
│                                  │
│         🎉 ¡Felicidades!        │
│                                  │
│       ┌─────────────────┐       │
│       │                 │       │
│       │      🍺         │       │
│       │                 │       │
│       └─────────────────┘       │
│                                  │
│   Has ganado:                    │
│   Una cerveza gratis             │
│                                  │
│   ╔══════════════════════╗       │
│   ║  ⭐ +1 sello de regalo║      │
│   ╚══════════════════════╝       │
│   (usa el stampIconName de la    │
│    tarjeta para el ícono)        │
│                                  │
│   [   ¡Reclamar!   ]             │
│                                  │
└──────────────────────────────────┘
```

2. En `/my-cards` la tarjeta muestra un badge "🎁 Nuevo" en la recompensa más reciente durante 7 días.

#### 4.3.3 Página de historial completo

Ruta: `/my-cards/rewards` o modal "Ver todas" desde el card detail:

```
┌────────────────────────────────────────────┐
│  🎁 Historial de Recompensas               │
│                                            │
│  Filtrar por tarjeta: [Todas ▼]           │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ 🍺 Cerveza gratis                  │   │
│  │ ☕ Café Zivelo · 15/05/2026        │   │
│  ├────────────────────────────────────┤   │
│  │ 🧁 Postre de regalo                │   │
│  │ ☕ Café Zivelo · 02/04/2026        │   │
│  ├────────────────────────────────────┤   │
│  │ 🍕 Pizza mediana                   │   │
│  │ 🍕 Pizzería Roma · 21/03/2026     │   │
│  └────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

#### 4.3.4 Estados

| Estado | UI |
|---|---|
| Sin recompensas aún | Texto "Aún no has obtenido recompensas. Sigue acumulando sellos." con icono de cofre cerrado |
| Cargando | Skeleton de lista (3 filas grises animadas) |
| Error al cargar claims | "No pudimos cargar tus recompensas" + botón reintentar |
| Nueva recompensa (≤7 días) | Badge "🎁 Nuevo" + borde highlight en la fila |
| Tarjeta con surprise desactivado | No mostrar la sección de recompensas ni el badge |

---

## 5. Edge Cases

| Escenario | Comportamiento |
|---|---|
| Pool vacío con surprise enabled | Rechazar en API (validación) |
| Se elimina la última reward del pool estando enabled | Deshabilitar automáticamente surprise + mostrar error |
| Cliente canjea justo cuando se edita el pool | La reward ya se asignó en el momento del canje, los claims son inmutables |
| Migración: tarjetas existentes sin rewards | `surpriseRewardsEnabled` por defecto `false`, `reward` se conserva |
| Peso no especificado | Default 1 (distribución uniforme) |
| Todos los pesos = 0 | Asignar weight=1 automáticamente a todos |

---

## 6. Archivos a Modificar / Crear

| Archivo | Acción |
|---|---|
| `prisma/schema.prisma` | Agregar `Reward`, `CustomerRewardClaim`, modificar `LoyaltyCard.reward` a opcional + `surpriseRewardsEnabled`, agregar `metadata Json?` a `StampLog` |
| `lib/card-utils.ts` | Helper `pickWeightedReward(rewards)` |
| `app/api/cards/route.ts` | Validar y persistir `rewards` array en `POST` |
| `app/api/cards/[id]/route.ts` | Validar y persistir `rewards` array en `PUT`; incluirlos en `GET` |
| `app/api/stamps/route.ts` | Lógica de selección aleatoria en `type === "redeem"` |
| `app/api/customers/[customerId]/claims/route.ts` | Nuevo endpoint GET |
| `components/dashboard/card-wizard` | Paso de recompensa con toggle fija/aleatoria |
| `components/dashboard/edit-card-dialog.tsx` | Misma UI que wizard |
| `app/dashboard/scan/page.tsx` | Mostrar `rewardClaim` en modal al canjear |
| `components/dashboard/customers-table.tsx` | Columna "Última recompensa" |
| `app/dashboard/my-cards/page.tsx` | Sección de historial de recompensas en card detail |
| `app/my-cards/page.tsx` | Misma sección en portal cliente standalone |
| `components/dashboard/reward-history.tsx` | **Nuevo** — componente compartido de lista de claims |
| `components/dashboard/reward-reveal-modal.tsx` | **Nuevo** — modal de revelación tipo cofre |
| `app/my-cards/rewards/page.tsx` | **Nuevo** — página de historial completo con filtro |
| `components/dashboard/reward-claim-row.tsx` | **Nuevo** — fila individual de claim con estados |

---

## 7. Orden de Implementación

1. Schema + migración
2. `pickWeightedReward()` helper + tests
3. API: GET /api/cards/:id incluye rewards
4. API: POST /api/cards acepta rewards
5. API: PUT /api/cards/:id acepta rewards
6. API: POST /api/stamps lógica de selección + crear claim
7. API: GET /api/customers/:id/claims
8. UI: Wizard paso de recompensa en /new
9.  UI: Edit card dialog
10. UI: Scan — modal al canjear (rewardClaim en respuesta)
11. UI: `RewardRevealModal` — animación tipo cofre en scan
12. UI: `RewardHistory` componente compartido
13. UI: Customers table — columna "Última recompensa"
14. UI: My cards (dashboard) — integrar `RewardHistory` en card detail
15. UI: My cards (standalone /my-cards) — integrar `RewardHistory`
16. UI: `/my-cards/rewards` — página de historial completo con filtro por tarjeta
