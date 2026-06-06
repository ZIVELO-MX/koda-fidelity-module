The KODA color palette is consistent across both the landing page and the app.

## Koda Orange — color de marca de la plataforma

El naranja Koda es el color primario de la plataforma Koda (no confundir con el `brandColor` de cada negocio cliente).

| Contexto           | Valor                          | Equivalente hex |
| ------------------ | ------------------------------ | --------------- |
| CSS variable app   | `oklch(0.705 0.191 41.116)`    | `#f97316`       |
| Default brandColor | `#f97316`                      | —               |
| Design system      | `#ff6b35`                      | —               |

- **`oklch(0.705 0.191 41.116)`** — valor usado en `app/globals.css` como `--primary` para la plataforma.  
  Equivale a Tailwind `orange-500` (`#f97316`).
- **`#f97316`** — valor hexadecimal que se usa como `brandColor` por defecto en formularios y semilla de base de datos.
- **`#ff6b35`** — valor original del design system (color de branding visual de Koda).

### Dónde aplica cada uno

- El `--primary` de la plataforma (`oklch(0.705 0.191 41.116)`) se usa en la landing page y en páginas fuera del layout del dashboard (scan, auth, etc.).
- Dentro del dashboard (`/dashboard/(main)/layout.tsx`), el `--primary` se **sobreescribe con el `brandColor` del negocio autenticado**, por lo que los elementos del dashboard reflejan la marca del cliente, no el naranja Koda.
- Los negocios configuran su propio `brandColor` desde `/dashboard/branding`. El valor por defecto es `#f97316`.



Base Colors

- Brand Orange: #ff6b35
- Brand Hover: #e8552b
- Brand Pressed: #cc4719
- Brand Soft: #fff1e9
- Brand Soft 2: #ffe3d4
- Brand Ink: #5a1f08

Backgrounds / Surfaces

- Background: #fafaf7
- Background 2: #f5f4ee
- Surface: #ffffff
- Surface 2: #f7f6f1
- Surface 3: #efede5
- Border: #ebe9e0
- Border Strong: #d9d6c9

Text Colors

- Primary Ink: #1c1b17
- Secondary Ink: #5e5a51
- Tertiary Ink: #8e897c
- Muted Ink: #b5b0a4

Status Colors

- Success: #15803d
- Warning: #b45309
- Danger: #b91c1c
- Info: #1e6db8
