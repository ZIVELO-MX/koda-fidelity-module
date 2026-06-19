# Changelog — dev `1.1.0` vs main `1.0.0`

> Cambios acumulados en `dev` que aún no están en `main`.
> Preparado para release. 62 commits desde el último merge a `main`.

## Features

- **Tarjetas archivadas** — ver, restaurar y eliminar tarjetas desactivadas; distinción entre archivado por negocio vs por cliente
- **Selector de ícono de sello** — campo `stampIconName` en tarjeta y negocio; `IconPicker` secundario para el sello con opción de logo del negocio
- **Opción "Logo" en picker** — si el negocio tiene logo, aparece como opción de ícono de tarjeta y sello
- **Vista previa sellada** — toggle Normal/Sellada en creación y edición de tarjetas
- **Vista previa en Branding** — branding page usa `LoyaltyCardPreview` con el ícono de sello configurado
- **Soporte para rol `sellador`** — dashboard y my-cards resuelven negocio vía `User.businessId`; selladores pueden leer datos del negocio

## Fixes

- **Logo en íconos del dashboard** — todas las páginas del dashboard (cards list, detail, home, archived, QR codes) ahora muestran el logo del negocio cuando `iconName === "logo"` en lugar de caer a la inicial
- **stampIconName en creación de tarjetas** — se carga por defecto desde el business al abrir `/dashboard/cards/new`
- **Error real en branding** — la página muestra el mensaje de error del servidor en lugar de "No fue posible guardar los cambios"
- **Logo en card preview** — el logo del negocio se muestra en la tarjeta solo cuando `iconName === "logo"`, no automáticamente
- **Navbar hotfix** — iconos invisibles en picker, texto activo del navbar, logo propagado a navegación
- **Comillas escapadas** — JSX en branding cumple con `react/no-unescaped-entities`

## UI

- Filtro Todas/Activas/Vencidas en listado de tarjetas con contador
- DeleteExpiredCardButton con confirmación
- Badge "Vencida" + banner informativo en detalle de tarjeta
- Alerta de próxima caducidad en dashboard home y scan
- QR inline en detalle de tarjeta
- Tabla de clientes sorteable y reutilizable (`CustomersTable`)
- Filtro por tarjeta en `/dashboard/customers`

## Infraestructura

- `stampIconName String?` agregado a `Business` y `LoyaltyCard` en schema
- `prisma db push` para sincronizar schema

## Testing

- 257 tests, 0 errores
- Tests para icon picker, stamp icon display, card preview branding

## Cómo deployar a main

```bash
git checkout main
git pull
git merge dev
git push origin main
```
