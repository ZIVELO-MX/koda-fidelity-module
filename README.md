<p align="center">
  <img src="public/short-logo.svg" alt="Koda Fidelity" width="120" height="120">
</p>

# Koda Fidelity

Digital loyalty cards for modern businesses.

![Release](https://img.shields.io/badge/release-v1.1.0-orange)
![Branch](https://img.shields.io/badge/patch-1.1.x--patch-blue)
![Made by](https://img.shields.io/badge/made%20by-Zivelo-ff6b35)

---

## Releases

| Versión | Rama | Estado |
| ------- | ---- | ------ |
| `v1.1.0` | `main` | 🟢 Estable — Multi-usuario, UX móvil, sellos y más |
| `v1.1.x` | `1.1.x-patch` | 🟢 Parches activos para la release actual |
| `v1.2.0` | `dev` | 🟡 En desarrollo |

## Stack

| Capa        | Tecnología                  |
| ----------- | --------------------------- |
| Frontend    | Next.js 16 + Tailwind CSS 4 |
| UI          | shadcn/ui (new-york)        |
| Deploy      | Vercel + Cloudflare         |
| DB          | Supabase (PostgreSQL)       |
| ORM         | Prisma                      |
| Auth        | Supabase Auth               |
| Wallet      | Próximamente (PKPass/JWT)   |

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

---

[Made by Zivelo](https://zivelo.dev)
