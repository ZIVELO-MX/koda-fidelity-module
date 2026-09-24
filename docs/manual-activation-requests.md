# FID-0028: solicitud de activación manual

No hay checkout ni webhook. `POST /api/subscription-requests` solo guarda una solicitud pendiente; **no cobra, no activa el plan y no publica la tarjeta**. La activación sigue siendo una operación interna.

## Contrato para el paywall

- `POST /api/subscription-requests` requiere sesión y negocio. Acepta únicamente `{ "plan": "LITE" | "PRO", "billingInterval": "MONTHLY" | "ANNUAL" }`. Devuelve `201` al crear, `200` al reutilizar o actualizar la solicitud pendiente.
- `GET /api/subscription-requests` devuelve `{ "request": null }` o `{ "request": { "ticketNumber", "plan", "billingInterval", "status", "businessName", "contactEmail", "createdAt" } }`. Ambas respuestas son privadas y no almacenables en caché.
- Solo puede haber una solicitud pendiente por negocio. Cambiar plan o modalidad conserva el folio y actualiza la solicitud; la interfaz debe ofrecer un correo nuevo con los valores actuales.
- Las rutas usan la sesión para resolver usuario y negocio. No aceptan `businessId` ni otros identificadores de cuenta enviados por el navegador. Los errores siguen `ApiErrorBody` con `requestId`.

La interfaz prepara un correo a `soporte@zivelo.dev` y ofrece copiarlo. La aplicación no envía el mensaje por sí misma: crear el ticket y abrir `mailto:` no prueban que el correo haya sido enviado.

## Operación de soporte

Primero, con acceso interno a la base y el folio recibido por correo:

```sh
pnpm billing:ticket -- show KF-XXXXXXXXXXXXXXXX
```

El comando muestra negocio, correo de contacto, plan y modalidad, además del comando exacto `billing:set-plan` para activar según la solicitud. Soporte confirma las condiciones con la persona antes de ejecutarlo. Después de activar, registra la atención:

```sh
BILLING_OPERATOR=<nombre-del-operador> pnpm billing:ticket -- complete KF-XXXXXXXXXXXXXXXX
```

`complete` no activa la suscripción: exige una suscripción activa con el plan y la modalidad solicitados y una auditoría interna con la clave `ticket:<folio>`. La activación interna sigue protegida y el folio no es una credencial. No ejecutar la migración de FID-0028 en development compartido antes de fusionar el PR que la contiene.
