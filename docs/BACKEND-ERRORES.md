# Contrato de errores de Koda Fidelity

Documento para backend. Verificado contra `dev` @ `29de56e` el 2026-09-01. Nada de esto está
implementado todavía. El equipo de diseño no toca `app/api/**` ni `lib/api-utils.ts`; esta
propuesta es para que la implementes tú, y al final está lo único que hacemos nosotros.

## 1. Estado actual

`handleApiError()` en `lib/api-utils.ts:93` traduce cuatro clases de error a HTTP y devuelve
siempre la misma forma:

```json
{ "error": "Customer has completed the card and must redeem first." }
```

Sobre eso hay tres problemas concretos:

1. **No hay código estable.** El único identificador es el texto. Si mañana mejoras la redacción,
   rompes cualquier cosa que dependa de él, y soporte no tiene qué preguntar.
2. **No hay referencia de solicitud.** Cuando alguien reporta "no me dejó sellar", no hay forma de
   encontrar ese evento en los registros.
3. **Los mensajes están en inglés** y el producto está en español. Hoy no se nota porque la
   interfaz casi siempre escribe su propio texto, pero cada vez que alguna pantalla muestre el
   campo `error` tal cual, la persona verá inglés.

Hay más de sesenta puntos donde se lanza un error en `app/api/**`, y varios comparten mensaje.
En `app/api/stamps/route.ts` las líneas 93, 97 y 101 devuelven las tres el mismo
`"Customer not found"` para tres situaciones distintas: el cliente no existe, pertenece a otro
negocio, o está inactivo. Eso está bien hecho a propósito, porque no filtra información a quien
sondea. El código de error debe conservar esa propiedad: mismo código hacia afuera, causa
distinta en el registro interno.

## 2. Forma de la respuesta

```json
{
  "error": "La tarjeta ya está completa.",
  "code": "KF-STAMP-001",
  "action": "Canjea la recompensa antes de agregar otro sello.",
  "requestId": "req_01J8M6W3A6F0",
  "retryable": false
}
```

`error` se mantiene para no romper nada de lo que ya existe. Los otros cuatro campos son nuevos.
Añade también `x-request-id` como cabecera de la respuesta, con el mismo valor.

## 3. Convención

```
KF-{DOMINIO}-{NÚMERO}
```

El código es permanente y no cambia nunca. El mensaje puede mejorar todas las veces que quieras.
El estado HTTP y el `requestId` viajan aparte y no forman parte de la identidad del error.

## 4. Catálogo

Cada fila está anclada a un punto real del código. Los que dicen "no existe todavía" son
situaciones que hoy se resuelven de otra forma o no se distinguen.

### Sesión y acceso

| Código | Situación | Dónde ocurre hoy | HTTP |
|---|---|---|---|
| `KF-AUTH-001` | Sin sesión o sesión expirada | `lib/api-utils.ts:64`, `app/api/join/route.ts:256`, `app/api/my-cards/[customerId]/route.ts:14` | 401 |
| `KF-AUTH-002` | Enlace mágico inválido o vencido | `app/auth/callback/route.ts`, código `otp_expired` de Supabase | 401 |
| `KF-AUTH-003` | Demasiadas solicitudes de enlace | `lib/actions/auth.ts:12` y el límite propio de Supabase | 429 |
| `KF-ACCOUNT-001` | Cuenta autenticada sin negocio asociado | `lib/api-utils.ts:73`. Es el resultado del punto B5 del handoff | 404 |
| `KF-ACCESS-001` | Rol sin permiso para la operación | `lib/api-utils.ts:89`, `app/api/users/[id]/route.ts:23` y `:60` | 403 |

### Tarjetas

| Código | Situación | Dónde ocurre hoy | HTTP |
|---|---|---|---|
| `KF-CARD-001` | La tarjeta no existe o es de otro negocio | `app/api/cards/[id]/route.ts:183`, `:227`, `:326`, `app/api/join/route.ts:193` | 404 |
| `KF-CARD-002` | La tarjeta ya venció | `app/api/join/route.ts:201`, `app/api/stamps/route.ts:105` | 409 |
| `KF-CARD-003` | La tarjeta está archivada y no admite altas | `app/api/join/route.ts:197` | 409 |
| `KF-CARD-004` | Datos de tarjeta inválidos | `app/api/cards/route.ts:135`, `:138`, `:143`, y sus equivalentes en `[id]/route.ts` | 400 |
| `KF-CARD-005` | Hito mal configurado, fuera de rango, sin etiqueta, duplicado o con probabilidad inválida | `app/api/cards/route.ts:148` a `:164` | 400 |
| `KF-CARD-006` | Solo las tarjetas vencidas se pueden retirar del portal | `app/api/my-cards/[customerId]/route.ts:26` | 409 |

### Clientes y sellado

| Código | Situación | Dónde ocurre hoy | HTTP |
|---|---|---|---|
| `KF-CUSTOMER-001` | Cliente inexistente, de otro negocio, o inactivo | `app/api/stamps/route.ts:93`, `:97`, `:101`, `app/api/join/route.ts:239` | 404 |
| `KF-STAMP-001` | La tarjeta ya está completa, hay que canjear antes de sellar | `app/api/stamps/route.ts:110` | 409 |
| `KF-STAMP-002` | Faltan sellos para poder canjear | `app/api/stamps/route.ts:180` | 409 |
| `KF-STAMP-003` | Dos operaciones simultáneas sobre el mismo cliente | `app/api/stamps/route.ts:125` y `:197`, capturado como `P2025` de Prisma | 409 |
| `KF-JOIN-001` | Alta con datos incompletos o correo inválido | `app/api/join/route.ts:182`, `:185`, `:188` | 400 |

### Equipo y negocio

| Código | Situación | Dónde ocurre hoy | HTTP |
|---|---|---|---|
| `KF-TEAM-001` | Límite de miembros alcanzado | `app/api/users/route.ts:52` | 409 |
| `KF-TEAM-002` | El correo ya pertenece a una cuenta | `app/api/users/route.ts:57` y `:70` | 409 |
| `KF-TEAM-003` | Rol inválido | `app/api/users/route.ts:46`, `app/api/users/[id]/route.ts:35` | 400 |
| `KF-BIZ-001` | Datos del negocio inválidos | `app/api/business/route.ts:94` | 400 |
| `KF-MEDIA-001` | Logo inválido o demasiado grande | No existe todavía. Hoy la subida a Supabase Storage falla sin error propio | 400 |

### Sistema

| Código | Situación | Dónde ocurre hoy | HTTP |
|---|---|---|---|
| `KF-SYS-001` | Error inesperado | `lib/api-utils.ts`, rama final de `handleApiError` | 500 |
| `KF-SYS-002` | Servicio no disponible, base de datos o Supabase caídos | No se distingue todavía del anterior | 503 |

Dos códigos son de interfaz y no tuyos: QR ilegible y permiso de cámara denegado. Los resolvemos
en el cliente y no viajan por la API.

## 5. Implementación base

```ts
export const ERROR_CATALOG = {
  "KF-STAMP-001": {
    status: 409,
    message: "La tarjeta ya está completa.",
    action: "Canjea la recompensa antes de agregar otro sello.",
    retryable: false,
  },
  "KF-STAMP-003": {
    status: 409,
    message: "Otra persona registró un movimiento al mismo tiempo.",
    action: "Actualiza el progreso del cliente y vuelve a intentar.",
    retryable: true,
  },
  "KF-SYS-001": {
    status: 500,
    message: "No pudimos completar la operación.",
    action: "Reintenta. Si continúa, comparte el código y la referencia.",
    retryable: true,
  },
} as const

export type ErrorCode = keyof typeof ERROR_CATALOG

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly context?: Record<string, unknown>,
  ) {
    super(ERROR_CATALOG[code].message)
    this.name = "AppError"
  }
}
```

`handleApiError` conserva las clases actuales para no romper nada y agrega el caso de `AppError`.
La migración puede ser gradual: cada `throw new ValidationError(...)` se convierte en
`throw new AppError("KF-...", { ... })` cuando toques ese archivo.

El manejador central debe:

1. Generar el `requestId` si no viene, o conservar el que llegó.
2. Registrar código, ruta, método, id de negocio, id de usuario, marca de tiempo y causa interna.
3. No registrar nunca contraseñas, tokens, correos completos ni cuerpos de solicitud.
4. Devolver hacia afuera solo lo que está en el catálogo, jamás el error interno.
5. Añadir `x-request-id` a toda respuesta, exitosa o no.

## 6. Riesgo específico de sellado y canje

`KF-STAMP-003` es un conflicto de carrera, y la reacción natural de soporte es repetir la
operación. **No se debe repetir un sello o un canje sin revisar antes `StampLog`**, porque la
primera operación pudo haberse aplicado. El control optimista de
`app/api/stamps/route.ts:114` y `:184` protege la base, pero no protege contra un humano
reintentando a mano.

## 7. Lo que hace la interfaz

Esta es nuestra parte, y depende de que exista lo anterior.

- Mostrar el mensaje en el sitio donde ocurrió el problema, no en un aviso flotante que se va.
- Enseñar `code` y `requestId` en texto pequeño, con un toque para copiar ambos.
- Usar `action` como el texto del botón de salida cuando la acción sea evidente.
- Usar `retryable` para decidir si se ofrece reintentar o no.
- No mostrar nunca el `requestId` sin el código, ni al revés. Soporte necesita los dos.

Ejemplo de lo que verá una persona:

> No pudimos registrar el sello.
> La tarjeta ya está completa. Canjea la recompensa antes de agregar otro sello.
> `KF-STAMP-001` · `req_01J8M6W3A6F0`

## 8. Orden sugerido

1. `AppError`, catálogo y `requestId` en el manejador central, sin cambiar ningún `throw`.
2. Migrar sellado y canje, que es donde más duele un error sin diagnóstico.
3. Migrar sesión, acceso y alta de clientes.
4. Migrar tarjetas, equipo y negocio.
5. Traducir los mensajes al español conforme migres cada uno.
6. Una prueba por código, en la ruta que lo emite.

Un runbook por código, con causas conocidas y pasos de resolución, tiene sentido cuando el
catálogo ya esté en producción y soporte empiece a recibir referencias. Antes de eso sería
documentación de algo que todavía no existe.
