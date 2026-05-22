# Koda Fidelity

Módulo SaaS de tarjetas de fidelidad digitales para **Apple Wallet** y **Google Wallet**.

Parte del ecosistema **Koda POS**. Ayuda a pequeños negocios a retener clientes sin tarjetas físicas.

## Stack

| Capa        | Tecnología                  |
| ----------- | --------------------------- |
| Frontend    | Next.js 16 + Tailwind CSS 4 |
| UI          | shadcn/ui (new-york)        |
| Deploy      | Vercel + Cloudflare         |
| DB          | Supabase (PostgreSQL)       |
| ORM         | Prisma                      |
| Auth        | Supabase Auth               |
| Wallet      | Generación propia (PKPass/JWT) |

## Pages

| Ruta                    | Descripción                          |
| ----------------------- | ------------------------------------ |
| `/`                     | Landing page                         |
| `/dashboard`            | Dashboard del negocio                |
| `/dashboard/cards`      | Tarjetas de fidelidad                |
| `/dashboard/cards/new`  | Crear tarjeta                        |
| `/dashboard/customers`  | Clientes                             |
| `/dashboard/branding`   | Personalización de marca             |
| `/dashboard/qr-codes`   | Códigos QR                           |
| `/dashboard/settings`   | Configuración del negocio            |
| `/join/[cardId]`        | Flujo para que clientes agreguen tarjeta |
| `/scan`                 | Escáner de sellado para empleados    |

## Scripts

```bash
pnpm dev       # Desarrollo
pnpm build     # Build producción
pnpm start     # Servir producción
pnpm lint      # Linter
```

## Documentación

Los docs están en `docs/` en español.

## Roadmap

Ver [`roadmap.md`](roadmap.md).
