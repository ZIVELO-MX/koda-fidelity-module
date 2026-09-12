# FID-C1 v1 — contratos consumidos por la interfaz

Fuente compartida para la integración de `benrod/1.2.0` y `rulaxx/1.2.0`. Los nombres
de campos y estados aquí descritos deben coincidir con los esquemas de `lib/*-contracts.ts`
y con OpenAPI antes de promover el resultado.

## Reglas transversales

- Cada mutación de sellos, clientes o suscripciones acepta `Idempotency-Key`; un reintento
  con la misma clave no crea un segundo efecto.
- Las respuestas HTTP de error tienen `{ error, code, action, requestId, retryable }` y
  la cabecera `x-request-id`.
- Una petición puede enviar `x-request-id`; el servidor lo conserva. Si falta, genera un
  UUID y lo devuelve en la respuesta.
- Los campos opcionales se representan como `null` cuando existen en el modelo; no se
  convierten silenciosamente a `""` ni se omiten sin documentarlo.

## Clientes

`GET /api/customers` devuelve `{ items, page, pageSize, total }`. Cada elemento usa `goal`
para la meta de sellos. Una colección vacía válida es `200` con `items: []`; un error HTTP
o un contrato desconocido no debe interpretarse como colección vacía.

## Invitaciones

`POST /api/users` responde `202` con `{ invitation }`. La contraseña temporal no forma parte
del contrato nuevo. La aceptación usa el token de un solo uso enviado por correo.

## Suscripción manual

`POST /api/subscription` requiere el secreto interno, `businessId`, la acción definida por
`manualSubscriptionSchema` y admite `Idempotency-Key`. `GET /api/subscription` devuelve
`{ entitlements }` para la sesión autenticada.

## Versionado

Cambios incompatibles requieren actualizar este documento y el contrato TypeScript/OpenAPI
en el mismo cambio. Una vez verificada la forma nueva, el consumidor integrado usa solo
`items`/`goal`; no mantiene una ruta silenciosa para la forma legacy.
