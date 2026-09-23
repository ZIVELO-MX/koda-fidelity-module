# FID-0007: ciclo de cuenta

La misión agrega soporte backend para que el onboarding sea reanudable y para que la
activación de planes no dependa todavía de un proveedor de pagos.

## Endpoints

- `GET /api/onboarding`: devuelve el progreso persistente, las categorías y los temas activos.
- `PATCH /api/onboarding`: guarda un borrador con `draftVersion` optimista.
- `POST /api/onboarding`: avanza u omite un paso; crear la primera tarjeta es transaccional.
- `GET /api/subscription`: devuelve el plan efectivo y sus entitlements.
- `POST /api/subscription`: permite activar, renovar, cambiar, cancelar o marcar manualmente una suscripción.
- `GET /api/customer-profile` y `PUT /api/customer-profile`: perfil asociado a la identidad autenticada con correo normalizado.
- `GET /api/account/closure`: preview de impacto del cierre.
- `POST /api/account/closure`: programa o cancela el cierre; programarlo exige autenticación reciente y rol admin.
- `POST /api/business/avatar`: carga un avatar en un bucket privado y registra su limpieza reintentable.

## Reglas de datos

- La primera activación manual de Lite concede un mes Pro y persiste su límite en `proTrialEndsAt`; las renovaciones y cambios de plan siguen siendo manuales y no ejecutan cobros.
- El vencimiento se aplica de forma idempotente, conserva una sola tarjeta Lite activa sin borrar las demás y registra `expire_pro_trial` en la auditoría de billing.
- El scheduler debe invocar cada hora `POST /api/cron/subscription-entitlements` con `Authorization: Bearer $CRON_SECRET`. Las rutas de onboarding, suscripción, tarjetas y alta pública actúan como respaldo si el worker se retrasa.
- El ledger se anonimiza (`customerId = null`) antes de un borrado permanente de cliente.
- El cierre de negocio se agenda a 30 días y su ejecución elimina el negocio en cascada después de la gracia.
- Durante la gracia el negocio queda en sólo lectura. Para ejecutar cierres vencidos temporalmente se invoca manualmente `POST /api/cron/account-closures` con `Authorization: Bearer $CRON_SECRET`; cada ejecución reintenta limpiezas fallidas.
- Las migraciones son expand-only, las tablas nuevas tienen RLS y el entorno de desarrollo se verifica con `DIRECT_URL` de `.env.development.local`.

El seed de desarrollo valida sus contraseñas y resuelve las identidades Auth antes de modificar
la base de datos. La identidad Auth y las filas Prisma no comparten transacción: si falla la
transacción Prisma después de crear o actualizar una identidad, una nueva ejecución reutiliza
esa identidad y vuelve a intentar únicamente la parte de datos. El seed no debe ejecutarse
contra producción.
