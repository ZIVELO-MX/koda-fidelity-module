# FID-0007: ciclo de cuenta

La misión agrega soporte backend para que el onboarding sea reanudable y para que la
activación de planes no dependa todavía de un proveedor de pagos.

## Endpoints

- `GET /api/onboarding`: devuelve el progreso persistente y las categorías activas.
- `PATCH /api/onboarding`: guarda un borrador con `draftVersion` optimista.
- `POST /api/onboarding`: avanza u omite un paso; crear la primera tarjeta es transaccional.
- `GET /api/subscription`: devuelve el plan efectivo y sus entitlements.
- `POST /api/subscription`: permite activar, renovar, cambiar, cancelar o marcar manualmente una suscripción.
- `GET /api/customer-profile` y `PUT /api/customer-profile`: perfil asociado a la identidad autenticada con correo normalizado.
- `GET /api/account/closure`: preview de impacto del cierre.
- `POST /api/account/closure`: programa o cancela el cierre; programarlo exige autenticación reciente y rol admin.
- `POST /api/business/avatar`: carga un avatar en un bucket privado y registra su limpieza reintentable.

## Reglas de datos

- La activación manual concede acceso Pro simbólico mediante `proAccessGranted`; no ejecuta cobros, renueva ni degrada automáticamente.
- Un downgrade a Lite requiere una activación manual explícita con `proAccessGranted: false` y conserva una sola tarjeta Lite activa sin borrar las demás.
- El ledger se anonimiza (`customerId = null`) antes de un borrado permanente de cliente.
- El cierre de negocio se agenda a 30 días y su ejecución elimina el negocio en cascada después de la gracia.
- Las migraciones son expand-only, las tablas nuevas tienen RLS y el entorno de desarrollo se verifica con `DIRECT_URL` de `.env.development.local`.
