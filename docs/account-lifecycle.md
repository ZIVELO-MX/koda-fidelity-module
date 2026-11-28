# FID-0007: ciclo de cuenta

La misión agrega soporte backend para que el onboarding sea reanudable y para que la
activación de planes no dependa todavía de un proveedor de pagos.

Para activar solicitudes FID-0028 desde soporte, consultar
[el procedimiento de FID-0029](fid-0029-support-runbook.md), incluidos reintentos,
recuperación de interrupciones, ensayo local y búsqueda de referencias de error.

## Endpoints

- `GET /api/onboarding`: devuelve el progreso persistente, las categorías y los temas activos.
- `PATCH /api/onboarding`: guarda un borrador con `draftVersion` optimista.
- `POST /api/onboarding`: avanza u omite un paso; crear la primera tarjeta es transaccional.
- `GET /api/subscription`: devuelve el plan efectivo y sus entitlements.
- `POST /api/subscription`: permite activar, renovar, cambiar, cancelar o marcar manualmente una suscripción.
- `GET /api/customer-profile` y `PUT /api/customer-profile`: perfil asociado a la identidad autenticada con correo normalizado.
- `GET /api/account/closure`: preview de impacto del cierre.
- `POST /api/account/closure`: soporte programa, cancela o ejecuta el cierre para el negocio indicado.
- `POST /api/business/avatar`: carga un avatar en un bucket privado y registra su limpieza reintentable.

## Cambio manual por correo

Para cambiar el plan de un negocio desde soporte:

```bash
export BILLING_OPERATOR="nombre del operador"
pnpm billing:manage-user
```

El asistente solicita correo, plan (`PRO`, `LITE` o `INACTIVO`), resumen y confirmación escrita. El correo identifica a un miembro vinculado; el plan se aplica al negocio completo. Antes de confirmar muestra a los miembros, invitaciones, tarjetas, plan actual y solicitudes pendientes.

`INACTIVO` cancela suscripciones activas, bloquea las tarjetas no archivadas y manda a todos los miembros al muro de espera. No borra usuarios ni invitaciones. Al elegir `PRO` o `LITE`, se reutiliza la modalidad vigente; si hay un folio pendiente, se actualiza al plan elegido y se cierra después de activar. El resumen se guarda en la auditoría.

## Reglas de datos

- La primera activación manual de Lite concede acceso Pro e informa la fecha de referencia en `proTrialEndsAt`. Al pasar esa fecha, el negocio conserva su acceso hasta que el equipo operativo aplique un cambio de plan. Las renovaciones y cambios manuales no ejecutan cobros.
- En la operación actual, `FID_AUTOMATIC_PRO_EXPIRY` queda desactivada. El endpoint `POST /api/cron/subscription-entitlements` responde con cero cambios después de autenticar el scheduler. Las consultas de la app conservan tanto el acceso como el estado de las tarjetas.
- El ledger se anonimiza (`customerId = null`) antes de un borrado permanente de cliente.
- El cierre de negocio se agenda a 30 días y su ejecución elimina el negocio en cascada después de la gracia.
- Durante la gracia el negocio queda en solo lectura. El panel indica cómo solicitar el cierre o su cancelación a soporte.
- El endpoint anterior del scheduler devuelve 410. El estado del scheduler remoto queda pendiente de verificar.

## Cierres manuales por soporte

Configurar `ACCOUNT_CLOSURE_INTERNAL_SECRET` en el servidor y entregar la credencial solo al equipo operativo. Tras verificar la solicitud y la identidad del negocio, usar `POST /api/account/closure` con el encabezado `x-account-closure-secret` y un cuerpo JSON con `businessId` y `action`.

- `schedule` inicia la gracia de 30 días. Repetir la solicitud conserva el cierre y el plazo existentes.
- `cancel` cancela un cierre programado durante la gracia y restablece el acceso de escritura.
- `execute` procesa solo el negocio indicado una vez vencida la gracia o reintenta una limpieza fallida. Revisar el resultado `processed` y el registro de ejecución antes de dar por cerrado el caso.
- Las migraciones son expand-only, las tablas nuevas tienen RLS y el entorno de desarrollo se verifica con `DIRECT_URL` de `.env.development.local`.

El seed de desarrollo valida sus contraseñas y resuelve las identidades Auth antes de modificar
la base de datos. La identidad Auth y las filas Prisma no comparten transacción: si falla la
transacción Prisma después de crear o actualizar una identidad, una nueva ejecución reutiliza
esa identidad y vuelve a intentar únicamente la parte de datos. El seed no debe ejecutarse
contra producción.
