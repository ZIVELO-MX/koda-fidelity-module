# Recompensas Sorpresa — Plan de Implementación

> Inspirado en cofres/recompensas de Clash Royale. Una tarjeta requiere N sellos para
> canjear la recompensa fija (flujo normal, no cambia). Además, se pueden configurar
> **recompensas sorpresa en posiciones específicas de sellos**. Al llegar a esa posición,
> el sistema lanza un evento: si la probabilidad es exitosa, se registra un claim y se
> muestra en UI. **No afecta el contador de sellos** — el cliente sigue su progreso normal.
> A futuro estos eventos se conectarán a un sistema de inventario.

---

## 1. Schema

### Nuevo modelo `MilestoneReward`

```prisma
model MilestoneReward {
  id           String       @id @default(cuid())
  cardId       String
  card         LoyaltyCard  @relation(fields: [cardId], references: [id], onDelete: Cascade)
  stampNumber  Int          // posición del sello que activa esta recompensa (1-based)
  label        String       // texto visible: "Una cerveza gratis", "20% OFF", etc.
  iconName     String?      // ícono del reward, usa getCardIcon() igual que card/stamp icons
  probability  Int          @default(100) // 0-100 (% de probabilidad de activarse)
  sortOrder    Int          @default(0)
  createdAt    DateTime     @default(now())

  @@unique([cardId, stampNumber])
  @@index([cardId])
}
```

### Nuevo modelo `CustomerMilestoneClaim`

```prisma
model CustomerMilestoneClaim {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  milestoneId String
  milestone   MilestoneReward @relation(fields: [milestoneId], references: [id])
  cardId      String   // denormalizado para queries rápidas
  label       String   // snapshot al momento del claim
  iconName    String?  // snapshot al momento del claim
  createdAt   DateTime @default(now())

  @@index([customerId])
  @@index([milestoneId])
  @@index([cardId])
}
```

### Modificación a `LoyaltyCard`

```prisma
model LoyaltyCard {
  // ...existing fields...
  reward              String            // se mantiene igual (recompensa fija al llegar a N)
  milestoneRewards    MilestoneReward[]  // recompensas sorpresa en posiciones específicas
}
```

### Modificación a `StampLog`

```prisma
model StampLog {
  id         String          @id @default(cuid())
  customerId String
  customer   Customer        @relation(fields: [customerId], references: [id])
  type       String          // "stamp" | "redeem" | "milestone"
  metadata   Json?           // { milestoneClaimId, milestoneLabel, milestoneIconName }
  createdAt  DateTime        @default(now())
}
```

Se agrega `type: "milestone"` y campo `metadata Json?`.

### Migración

1. Crear tabla `MilestoneReward` con FK a `LoyaltyCard`
2. Crear tabla `CustomerMilestoneClaim` con FK a `Customer` y `MilestoneReward`
3. `ALTER TABLE StampLog ADD COLUMN metadata JSONB;`
4. Actualizar constraint de `StampLog.type` para aceptar `"milestone"`

---

## 2. API

### 2.1 Crear/Editar Tarjeta — `POST /api/cards` / `PUT /api/cards/:id`

Aceptar nuevo campo opcional:

```ts
{
  // ...existing fields...
  milestoneRewards?: {
    stampNumber: number   // 1-based, 1 ≤ stampNumber ≤ stampsRequired
    label: string
    iconName?: string | null
    probability: number   // 0-100
  }[]
}
```

**Validaciones:**
- `stampNumber` único por tarjeta, dentro del rango 1..stampsRequired
- `probability` entre 0 y 100
- `label` requerido, no vacío
- Si `milestoneRewards` está vacío o no se envía: se eliminan los existentes (los claims históricos se conservan)

### 2.2 Obtener Tarjeta — `GET /api/cards/:id`

Incluir en respuesta:

```ts
{
  card: {
    // ...existing...
    milestoneRewards: {
      id: string
      stampNumber: number
      label: string
      iconName: string | null
      probability: number
    }[]
  }
}
```

### 2.3 Agregar Sello — `POST /api/stamps`

Lógica ampliada (se ejecuta **después** de registrar el sello):

```ts
// Cuando type === "stamp", verificar si hay milestone en esta posición
const newStampCount = customer.stamps + 1  // después de sumar el sello actual
const milestone = card.milestoneRewards.find(m => m.stampNumber === newStampCount)

if (milestone) {
  const roll = Math.random() * 100
  if (roll < milestone.probability) {
    // Crear claim
    const claim = await prisma.customerMilestoneClaim.create({
      data: {
        customerId,
        milestoneId: milestone.id,
        cardId: card.id,
        label: milestone.label,
        iconName: milestone.iconName,
      },
    })

    // Log como milestone event
    await prisma.stampLog.create({
      data: {
        customerId,
        type: "milestone",
        metadata: {
          milestoneClaimId: claim.id,
          milestoneLabel: milestone.label,
          milestoneIconName: milestone.iconName,
        },
      },
    })

    // Incluir en respuesta
  }
}
```

**Respuesta ampliada:**

```ts
{
  customer: { ... }
  milestoneClaim?: {
    id: string
    label: string
    iconName: string | null
    stampNumber: number
  }
}
```

### 2.4 Listar Claims — `GET /api/customers/:customerId/milestones`

Endpoint nuevo:

```
GET /api/customers/:customerId/milestones?cardId=optional

Response:
{
  milestones: {
    id: string
    label: string
    iconName: string | null
    cardName: string
    createdAt: string
  }[]
}
```

---

## 3. UI — Probabilidad y Rarities (Colores Clash Royale)

### 3.1 Colores del slider según rareza

El slider de probabilidad cambia de color dinámicamente según el valor,
usando rangos inspirados en Clash Royale ajustados a la paleta de la app:

| Rango      | Rareza     | Color CSS                                          | Uso                         |
|------------|------------|----------------------------------------------------|-----------------------------|
| 100%       | ❄️ Común   | `oklch(0.6 0.02 260)` — gris azulado               | Siempre ocurre              |
| 50–99%     | 🟠 Rara    | `oklch(0.65 0.18 40)` — naranja (primary de la app)| Alta probabilidad           |
| 25–49%     | 🟣 Épica   | `oklch(0.55 0.22 290)` — violeta                   | Media probabilidad          |
| 10–24%     | 🔵 Legendaria | `oklch(0.6 0.18 230)` — cian                     | Baja probabilidad           |
| 0–9%       | 🔴 Campeón | `oklch(0.6 0.22 350)` — rosa/rojo                  | Muy baja (casi nunca)       |

```ts
const RARITY_COLORS = [
  { max: 9,   color: "oklch(0.6 0.22 350)" },   // Campeón
  { max: 24,  color: "oklch(0.6 0.18 230)" },   // Legendaria
  { max: 49,  color: "oklch(0.55 0.22 290)" },  // Épica
  { max: 99,  color: "oklch(0.65 0.18 40)" },   // Rara
  { max: 100, color: "oklch(0.6 0.02 260)" },   // Común
]
```

El slider se renderiza con `accent-color` dinámico según la probabilidad actual.
Además, se muestra un badge al lado con el nombre de la rareza (Común / Rara / Épica / Legendaria / Campeón) y un tooltip con la probabilidad exacta.

### 3.2 Componente `ProbabilitySlider`

```
┌─────────────────────────────────────────────┐
│  Probabilidad                               │
│                                             │
│  ─────●──────────────────────────── 75%     │
│       🟠 Rara                               │
│                                             │
│  "1 de cada 4 clientes obtendrá este bonus" │
└─────────────────────────────────────────────┘
```

- Slider nativo `<input type="range" min="0" max="100">`
- `accent-color` bindeado al color del rarity actual
- Display de % exacto a la derecha
- Badge de rareza debajo con el nombre
- Texto descriptivo dinámico:
  - 100% → "Todos los clientes obtendrán este bonus"
  - 50% → "1 de cada 2 clientes"
  - 25% → "1 de cada 4 clientes"
  - etc.

---

## 4. UI — Configuración

### 4.1 Wizard Crear Tarjeta (`/dashboard/cards/new`)

Paso "Recompensas en el camino" (nuevo paso opcional después del paso de Recompensa):

```
┌──────────────────────────────────────────────────────────┐
│  🎁 Recompensas en el Camino                             │
│                                                          │
│  Agrega recompensas sorpresa que aparecen al llegar a    │
│  posiciones específicas de sellos. No afectan el progreso │
│  ni el canje final.                                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Sello #3                                           │  │
│  │ ┌──────────────────┐ ┌──────────┐ ┌──────────────┐ │  │
│  │ │ 🎁 Café gratis   │ │ [icon] ▼ │ │ ████░░ 75%  │ │  │
│  │ └──────────────────┘ └──────────┘ │ 🟠 Rara      │ │  │
│  │                                    └──────────────┘ │  │
│  │                                          [ ✕ ]      │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Sello #5 — Recompensa final (100%)                 │  │
│  │ ┌──────────────────┐ ┌──────────┐ ┌──────────────┐ │  │
│  │ │ 🏆 Pizza gratis  │ │ [icon] ▼ │ │ ██████ 100%  │ │  │
│  │ └──────────────────┘ └──────────┘ │ ❄️ Común     │ │  │
│  │                                    └──────────────┘ │  │
│  │                                          [ ✕ ]      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [ + Agregar recompensa en sello #... ]                  │
│                                                          │
│  (nota: la recompensa final en sello N se agrega         │
│   automáticamente, pero puede editarse o quitarse)        │
└──────────────────────────────────────────────────────────┘
```

**UX:**
- Selector de posición: input numérico (1..stampsRequired) con label "Sello #N"
- Campo de texto para el label
- Botón para abrir `IconPicker` (reutiliza el existente de `lib/card-icons.ts`)
- `ProbabilitySlider` con colores de rareza (sección 3.1)
- Botón ✕ para eliminar milestone
- Botón "+ Agregar recompensa" con dropdown para seleccionar posición libre
- La posición N (stampsRequired) se auto-agrega como "Recompensa final" con 100% (editable/eliminable)
- Validación: posiciones únicas

### 4.2 Editar Tarjeta — Dialog

Misma UI que wizard, dentro del dialog de edición existente.

Si hay `CustomerMilestoneClaim` asociados a un milestone que se elimina:
- Confirmación: "Hay N clientes que ya obtuvieron este bonus. ¿Eliminar de todas formas?"
- Los claims históricos se conservan
- Nuevos clientes ya no recibirán ese milestone

### 4.3 IconPicker

Reutiliza el `IconPicker` de `lib/card-icons.ts` exactamente como está (mismos íconos, misma UI de selector de cuadrícula). Se asigna a `MilestoneReward.iconName`.

---

## 5. UI — Cliente (Scan & Dashboard)

### 5.1 Scan al agregar sello

Cuando el admin/sellador hace clic en "Sellar":

1. POST /api/stamps con type="stamp"
2. Si `milestoneClaim` viene en respuesta:
   - Toast o modal ligero: `[icon] ¡Bonus! [label]` con el iconName y color de rareza
   - El iconName del milestone se renderiza con `getCardIcon(milestoneClaim.iconName)`
   - El color del toast usa el color de rareza correspondiente a la probabilidad
3. Si no (stamp normal sin milestone): comportamiento actual

### 5.2 Dashboard del negocio — Detalle de tarjeta

En `/dashboard/cards/[id]`:
- Badge "🎁 N recompensas en camino" si hay milestones configurados
- En la tabla de clientes: columna "Bonos obtenidos" con contador de milestones ganados

### 5.3 Portal del cliente — `/my-cards` y `/dashboard/my-cards`

#### 5.3.1 Card detail — sección "Bonos Obtenidos"

```
┌────────────────────────────────────────────┐
│  ☕ Café Zivelo              🟡 8/10       │
│  ───────────────────────────────────────── │
│  🎁 Bonos Obtenidos                       │
│                                            │
│  🏆 Pizza gratis           sello #5        │
│  🎁 Café gratis            sello #3        │
│                                            │
│  [Ver todos] si hay más de 3              │
└────────────────────────────────────────────┘
```

- Cada claim: iconName (renderizado con `getCardIcon`) + label + "sello #N"
- Ordenado del más reciente al más antiguo

#### 5.3.2 Estados

| Estado | UI |
|---|---|
| Sin milestones configurados en la tarjeta | No mostrar la sección |
| Sin bonos obtenidos aún | Texto "Sigue sellando para descubrir bonos sorpresa en el camino" con icono 🎁 |
| Cargando | Skeleton de lista (3 filas) |
| Error al cargar | "No pudimos cargar tus bonos" + reintentar |
| Nuevo bono (≤7 días) | Badge "🎁 Nuevo" + borde highlight |

---

## 6. Tests

### 6.1 Unitarios — `lib/card-utils.test.ts`

| Test | Descripción |
|---|---|
| `pickMilestoneReward` selecciona reward cuando roll < probability | Mock Math.random para probar cada rarity |
| `pickMilestoneReward` retorna null cuando roll >= probability | Probabilidad 30%, roll 0.5 → null |
| `pickMilestoneReward` con probability 100 siempre gana | 10 iteraciones, todas ganan |
| `pickMilestoneReward` con probability 0 nunca gana | 10 iteraciones, ninguna gana |
| `rarityColor` retorna el color correcto para cada rango | 0, 5, 15, 35, 75, 100 |
| `rarityLabel` retorna el nombre de rareza correcto | Campeón, Legendaria, Épica, Rara, Común |
| `rarityDescription` retorna texto descriptivo según % | "Todos los clientes", "1 de cada 2", etc. |

### 6.2 API — `POST /api/stamps`

| Test | Descripción |
|---|---|
| Agregar sello sin milestone configurado | Comportamiento existente, sin cambios |
| Agregar sello en posición sin milestone | Respuesta normal, sin `milestoneClaim` |
| Agregar sello en posición con milestone y probabilidad exitosa | `milestoneClaim` en respuesta + `CustomerMilestoneClaim` creado + StampLog con type "milestone" |
| Agregar sello en posición con milestone y probabilidad fallida | Sin `milestoneClaim`, sin claim creado |
| milestone en posición > stampsRequired | Ignorado (validación en create/update) |
| Múltiples clientes en misma posición milestone | Cada uno recibe su propio claim independiente |
| Cliente ya tiene milestone en esa posición | No hay límite, pero se crea otro claim (es un evento, no una colección) |

### 6.3 API — `POST /api/cards`

| Test | Descripción |
|---|---|
| Crear tarjeta con `milestoneRewards` válido | Se persisten los milestones |
| Crear tarjeta con `stampNumber` duplicado | Error 400 |
| Crear tarjeta con `stampNumber` > stampsRequired | Error 400 |
| Crear tarjeta sin `milestoneRewards` | Comportamiento existente |
| Crear tarjeta con `probability` fuera de rango | Error 400 |

### 6.4 API — `PUT /api/cards/:id`

| Test | Descripción |
|---|---|
| Editar tarjeta, agregar milestone nuevo | Se persiste |
| Editar tarjeta, eliminar milestone existente | Milestone se borra, claims históricos se conservan |
| Editar tarjeta, cambiar probability de milestone existente | Se actualiza |

### 6.5 UI — `ProbabilitySlider`

| Test | Descripción |
|---|---|
| Slider muestra el color correcto por rango | 10% → legendario, 50% → raro, etc. |
| Slider muestra el badge de rareza correcto | "Legendaria", "Épica", etc. |
| Slider muestra texto descriptivo correcto | "1 de cada 10 clientes" para 10% |
| Input type="range" acepta valores 0-100 | Validación de límites |

### 6.6 UI — `IconPicker` en milestone

| Test | Descripción |
|---|---|
| IconPicker se abre y muestra la grilla de íconos | Mismo comportamiento que en card/edición |
| Seleccionar icono lo asigna al milestone | `iconName` se actualiza en el estado local |
| Deseleccionar icono lo deja null | `iconName` nullable |

---

## 7. Edge Cases

| Escenario | Comportamiento |
|---|---|
| Milestone con probability 0% | Existe en la UI pero nunca se activa. Sirve para documentar o activar después |
| Se elimina un milestone con claims existentes | Claims históricos se conservan (snapshot), milestone se borra de la tarjeta |
| stampsRequired se reduce y un milestone existente queda fuera de rango | Se elimina automáticamente el milestone al guardar + confirmación al usuario |
| stampsRequired se incrementa | Los milestones existentes se conservan, hay nuevas posiciones libres |
| Cliente llega a la posición vía sello de regalo (futuro) | Ya no hay sello de regalo, el milestone solo se dispara con sellos reales |
| Dos milestones en la misma posición | No posible (`@@unique([cardId, stampNumber])`) |

---

## 8. Archivos a Modificar / Crear

| Archivo | Acción |
|---|---|
| `prisma/schema.prisma` | Agregar `MilestoneReward`, `CustomerMilestoneClaim`; agregar `metadata Json?` a `StampLog` |
| `lib/card-utils.ts` | Helpers: `pickMilestoneReward(customerStamps, milestones)`, `getRarityColor(probability)`, `getRarityLabel(probability)`, `getRarityDescription(probability)` |
| `lib/__tests__/card-utils.test.ts` | Tests de helpers (sección 6.1) |
| `app/api/cards/route.ts` | Validar y persistir `milestoneRewards[]` en `POST` |
| `app/api/cards/[id]/route.ts` | Validar y persistir `milestoneRewards[]` en `PUT`; incluirlos en `GET` |
| `app/api/stamps/route.ts` | Lógica de milestone check después de agregar sello |
| `app/api/customers/[customerId]/milestones/route.ts` | **Nuevo** endpoint GET historial |
| `components/dashboard/probability-slider.tsx` | **Nuevo** slider con colores de rareza |
| `components/dashboard/milestone-reward-row.tsx` | **Nuevo** fila de milestone editable (posición + label + icono + probabilidad + eliminar) |
| `components/dashboard/milestone-rewards-editor.tsx` | **Nuevo** contenedor del paso/pestaña de milestones (lista + botón agregar) |
| `components/dashboard/card-wizard.tsx` | Integrar paso de milestones |
| `components/dashboard/edit-card-dialog.tsx` | Integrar editor de milestones |
| `app/dashboard/scan/page.tsx` | Mostrar `milestoneClaim` en toast al sellar |
| `components/dashboard/customers-table.tsx` | Columna "Bonos obtenidos" (contador) |
| `components/dashboard/milestone-history.tsx` | **Nuevo** componente compartido de lista de milestones obtenidos |
| `components/dashboard/milestone-claim-row.tsx` | **Nuevo** fila individual de claim (icon + label + sello #N + fecha) |
| `app/dashboard/my-cards/page.tsx` | Integrar `MilestoneHistory` en card detail |
| `app/my-cards/page.tsx` | Integrar `MilestoneHistory` en card detail |

---

## 9. Orden de Implementación

1. Schema + migración
2. Helpers en `card-utils.ts` + tests (sección 6.1)
3. API: `GET /api/cards/:id` incluye milestones
4. API: `POST /api/cards` acepta milestones
5. API: `PUT /api/cards/:id` acepta milestones (con manejo de claims existentes)
6. API: `POST /api/stamps` lógica de milestone check
7. API: `GET /api/customers/:id/milestones`
8. UI: `ProbabilitySlider` componente
9. UI: `MilestoneRewardRow` + `MilestoneRewardsEditor` componentes
10. UI: Card wizard — paso de milestones
11. UI: Edit card dialog — editor de milestones
12. UI: Scan — toast al sellar con milestone
13. UI: `MilestoneHistory` + `MilestoneClaimRow` componentes
14. UI: Customers table — columna "Bonos obtenidos"
15. UI: My cards — integrar `MilestoneHistory`
