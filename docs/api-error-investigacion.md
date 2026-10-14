# «API Error» genérico: qué es, qué encontré y qué sigue sin reproducirse

Investigación acotada sobre el mensaje `API Error` sin atribuir. Fecha: 2026-09-27.
Rama: `fix/api-error-sin-atribuir`, desde `origin/dev` en `742ab1f`.

## De dónde sale

El literal aparece **una sola vez en todo el código**, y no es un mensaje de interfaz:

```
lib/api-utils.ts:181
console.error("API Error", { requestId, errorName: ... })
```

Es la **rama de descarte de `handleApiError`**. Esa función mapea seis clases de error a su
código del contrato (`KF-AUTH-001`, `KF-ACCESS-001`, `KF-ACCOUNT-READONLY`, `KF-CUSTOMER-001`,
`KF-REQUEST-001`). Cualquier excepción que no sea una de las seis cae al final: se registra esa
línea y se devuelve un 500 `KF-SYS-001` con «Internal server error» y `retryable: true`.

«Sin atribuir» es literal: el registro lleva solo `requestId` y `errorName`. No dice la ruta, ni
el mensaje, ni la pila. Cuando ocurre, no se puede saber qué se rompió.

## El recorrido, repetido

Servidor de producción local (`pnpm build && pnpm start`) contra la base de desarrollo
compartida. Ocho rutas públicas por tres anchos, **24 cargas**, capturando errores de consola,
`pageerror` y toda respuesta HTTP ≥ 400:

`/`, `/login`, `/signup`, `/privacidad`, `/my-cards`, `/invite`, `/auth/error`, `/join/no-existe`

Resultado:

- **Cero respuestas 500. Cero `KF-SYS-001`. Cero apariciones de `API Error`** en el log del
  servidor, que se vigiló durante todo el recorrido.
- Tres respuestas ≥ 400, todas la misma y buscada a propósito: `/api/cards/no-existe` devolviendo
  **404 `KF-CUSTOMER-001`** con su acción. Es el contrato funcionando, no un fallo.
- Tres errores de consola, los del mismo 404.

**El alta autenticada queda fuera de este recorrido**, y es una limitación real de esta
evidencia: recorrerla contra `development` compartido crearía borradores y tarjetas, y eso no se
hace. Con Supabase local tampoco puedo: no hay Docker en esta máquina.

## Lo que sí encontré: un camino que cae en esa rama

`request.json()` lanza un `SyntaxError` cuando el cuerpo viene mal formado. No es ninguna de las
seis clases, así que caía en la rama de descarte. **Catorce rutas** lo llamaban dentro del `try`
sin proteger el parseo.

El resultado era un mensaje engañoso en dos sentidos: un cuerpo roto es un error del cliente y se
devolvía **500 «Internal server error»**, y además con **`retryable: true`**, que invita a
reintentar algo que nunca va a parsear.

Reproducido en `lib/__tests__/cuerpo-json.test.ts`. La primera prueba fija el comportamiento
anterior (500, `KF-SYS-001`, `retryable: true`) y pasa contra el código de `dev`; la segunda
falla contra `dev` y pasa con el arreglo.

### El arreglo

Un helper, `cuerpoJson`, que envuelve el parseo y lanza `ValidationError`, que ya existía y ya
mapea a 400 `KF-REQUEST-001` con «Corrige los datos enviados» y `retryable: false`. Aplicado a
los quince puntos que están dentro de un `try`.

**No se mapeó `SyntaxError` a 400 en `handleApiError`**, que habría sido una línea en vez de
quince. `lib/passes/google.ts` lee la clave de servicio con `JSON.parse`: si estuviera mal
formada, ese atajo le diría al usuario «corrige los datos enviados» por una mala configuración
nuestra. Cambiar un mensaje engañoso por otro no es un arreglo. Hay una prueba que fija esto: un
`SyntaxError` ajeno al cuerpo sigue siendo 500.

### Comprobado en el servidor real

`/api/join` es la única de las quince alcanzable sin sesión. Con un cuerpo roto devuelve ahora
**400 `KF-REQUEST-001` `retryable: false`**. Las demás validan la sesión antes de parsear, así
que responden 401: **el fallo solo era alcanzable con una sesión válida**, lo que limita bastante
su exposición real.

## Qué queda sin reproducir

**El avistamiento original sigue sin reproducirse.** Encontré *un* camino que entra en esa rama,
no pruebas de que sea *el* que se vio. No los doy por el mismo caso.

Dos cosas más, anotadas y sin tocar:

1. **`app/api/passes/apple/[cardId]` y `.../google/[cardId]` parsean el cuerpo fuera de todo
   `try`.** Ahí un cuerpo roto ni siquiera llega a `handleApiError`: es un 500 de Next. Arreglarlo
   pide envolver el manejador, que es otro cambio. No lo toqué a medias.
2. **El registro sigue llevando solo `requestId` y `errorName`.** Añadirle la ruta lo volvería
   atribuible, pero el mensaje y la pila pueden arrastrar datos del usuario, y sospecho que por
   eso se dejó así. Es una decisión de Raúl, no un arreglo que deba meter por mi cuenta.

Mientras el registro no diga la ruta, la próxima aparición volverá a ser igual de difícil de
ubicar. Con quince puntos menos donde caer, al menos hay menos sitios donde buscar.
