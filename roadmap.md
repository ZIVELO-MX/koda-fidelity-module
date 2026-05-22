# Koda Fidelity — Roadmap

> Basado en el análisis del proyecto, `docs/idea.md`, `docs/colors.md`, `docs/deploy.md` y decisiones del equipo.

---

## Stack Definido

| Capa        | Tecnología                     |
| ----------- | ------------------------------ |
| Frontend    | Next.js 16 + Tailwind CSS 4    |
| UI          | shadcn/ui (new-york)           |
| Deploy      | Vercel + Cloudflare (DNS/WAF)  |
| DB          | Supabase (PostgreSQL)          |
| ORM         | Prisma                         |
| Auth        | Supabase Auth                  |
| Wallet      | Generación propia (PKPass/JWT) |

---

## Fases

### Fase 0 — Setup de infraestructura

- [ ] Crear proyecto Supabase
- [ ] Configurar Prisma con schema inicial (businesses, loyalty_cards, customers, stamps)
- [ ] Conectar Supabase Auth (login dueños de negocio)
- [ ] Migrar datos mock a DB real
- [ ] Configurar variables de entorno en Vercel
- [ ] Apuntar dominio desde Cloudflare a Vercel

### Fase 1 — Wallet Passes (Apple Wallet)

- [ ] Investigar formato PKPass (archivo .pkpass con manifest.json, pass.json, imágenes)
- [ ] Crear endpoint `/api/passes/apple/:cardId` que genere y firme un PKPass
- [ ] Generar certificado Apple Wallet (Pass Type ID + certificado de firma)
- [ ] Implementar lógica de actualización de passes (stamps update via push)
- [ ] Integrar botón "Add to Apple Wallet" en el flujo `join/[cardId]`
- [ ] Probar pases en dispositivo real / simulador

### Fase 2 — Wallet Passes (Google Wallet)

- [ ] Investigar Google Wallet API (JWT + issuer class/object)
- [ ] Configurar cuenta Google Pay & Wallet Console
- [ 】Crear endpoint `/api/passes/google/:cardId` que genere JWT firmado
- [ ] Implementar clase y objeto de loyalty card en Google Wallet
- [ ] Integrar botón "Add to Google Wallet" en el flujo `join/[cardId]`
- [ ] Probar pases en Android / emulador

### Fase 3 — Backend real + API Routes

- [ ] Migrar todas las páginas a datos reales desde Supabase
- [ ] Crear API routes REST:
  - `POST /api/cards` — crear tarjeta de fidelidad
  - `GET /api/cards` — listar tarjetas
  - `GET /api/cards/:id` — detalle de tarjeta
  - `POST /api/stamps` — agregar sello
  - `GET /api/customers` — listar clientes
  - `GET /api/dashboard/stats` — estadísticas del dashboard
- [ ] Autenticar rutas con Supabase Auth (middleware)
- [ ] Proteger rutas del dashboard con session check

### Fase 4 — Dashboard completo

- [ ] Dashboard home con datos reales (stats, actividad reciente)
- [ ] CRUD de tarjetas de fidelidad
- [ ] Gestión de clientes con datos reales
- [ ] Generación de QR codes funcionales por tarjeta
- [ ] Personalización de marca (logo, color) persistente
- [ ] Configuración del negocio

### Fase 5 — Flujo de sellado (Scan)

- [ ] Implementar escáner QR real (cámara) en `/scan`
- [ ] Conectar escaneo con endpoint de sellado
- [ ] Feedback visual en tiempo real al empleado
- [ ] Mostrar cliente encontrado y progreso actual
- [ ] Botón "Add Stamp" + "Redeem Reward" funcionales

### Fase 6 — Landing page + polish

- [ ] Conectar landing page a datos reales (precios, features)
- [ ] SEO básico (meta tags, Open Graph)
- [ ] Analíticas con Vercel Analytics
- [ ] Modo responsive completo
- [ ] Estados vacíos, carga, error en todas las páginas

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

## Prioridades inmediatas (próximas semanas)

1. **Wallet Passes (Apple & Google)** — es la feature core del producto
2. **Supabase + Prisma setup** — necesario para que los pases sean reales
3. **Auth** — para que dueños de negocio puedan gestionar sus tarjetas
4. **Backend real** — migrar datos mock a API real
5. **Dashboard + Scan** — conectar todo el flujo end-to-end
