# Contratos de contenido, estados y errores

Qué texto y qué estado muestra cada superficie. Los nombres de estado y los códigos de error se
toman de `operaciones-backend.md` de la fuente canónica; aquí no se inventa ninguno.

## 1. Estados por superficie

Los cinco estados que toda superficie confirmada entrega, no solo el caso feliz.

| Superficie | Carga | Vacío | Error | Sin permiso | Dato parcial |
|---|---|---|---|---|---|
| Panel | Esqueleto con la forma final: tres cifras, caja de gráfica, tres filas de actividad | "Crea tu primera tarjeta y comparte su QR" con un solo botón | Qué falló y el botón que lo corrige, en la propia sección | Qué es esta sección y a quién pedirle acceso | La cifra visible con marca de parcial y la nota de qué se está contando |
| Escáner | Visor con retículo, sin pantalla previa | No aplica: siempre hay cámara o búsqueda | Permiso de cámara denegado, con la búsqueda por nombre a la vista | El rol sellador entra directo aquí | No aplica |
| Clientes | Esqueleto de filas | "Comparte el código QR para que se unan" | Error de la fila, sin perder el resto de la tabla | Sección no disponible para el rol | No aplica |
| Portal del cliente | Esqueleto de tarjeta | "Todavía no tienes tarjetas" | Reintentar sin perder la sesión | No aplica | No aplica |
| Alta de negocio | Botón en estado de envío | No aplica | Error inline en el campo, con foco en el primero inválido | No aplica | No aplica |

**Regla del dato parcial.** Una cifra que el backend todavía no calcula bien se marca como parcial
y se explica. No se presenta como cero ni se oculta en silencio.

## 2. Errores

La respuesta trae `error`, `code`, `action`, `requestId` y `retryable`.

- El mensaje se muestra **donde ocurrió el problema**, no en un aviso flotante que se va.
- `code` y `requestId` van juntos, en texto pequeño, copiables de un toque. **Nunca uno sin el
  otro**: soporte necesita los dos.
- `action` se convierte en la etiqueta del botón de salida cuando la acción es evidente.
- `retryable` decide si se ofrece reintentar. Si es falso, no se ofrece.

Ejemplo de lo que ve una persona:

> No pudimos registrar el sello.
> La tarjeta ya está completa. Canjea la recompensa antes de agregar otro sello.
> `KF-STAMP-001` · `req_01J8M6W3A6F0`

Los códigos que la interfaz representa con pantalla propia, y no solo con un mensaje en línea, son
`KF-ACCESS-001` para permiso insuficiente, `KF-ACCOUNT-001` para sesión sin negocio asociado, y
`KF-SYS-002` para servicio no disponible.

## 3. Métricas y actividad

- `redemptionRate` puede llegar como `null` cuando no hay ciclos completos. **Se representa como
  falta de datos, no como cero.** El texto es "Sin ciclos completos todavía".
- La serie diaria vacía muestra la caja de la gráfica con su explicación, nunca una línea plana en
  cero, que se leería como que el negocio no vendió.
- La actividad se pagina con `cursor` opaco y `limit` de 1 a 100, por defecto 20. La interfaz pide
  la siguiente página al llegar al final de la lista, sin numeración de páginas.
- Toda cifra que se alinea en columna va en mono tabular.

## 4. Estados del alta y de la tarjeta

Los nombres son los del contrato, no se traducen en el código.

`OnboardingStatus`: `IN_PROGRESS`, `AWAITING_PAYMENT`, `COMPLETED`.

- `IN_PROGRESS` solo accede al alta.
- `AWAITING_PAYMENT` puede consultar el panel y la facturación en modo restringido. Es el estado de
  quien abandonó en el muro de pago.
- `COMPLETED` obtiene permisos según su plan.

`CardStatus`: `DRAFT`, `ACTIVE`, `LOCKED_BY_PLAN`, `ARCHIVED`.

- `DRAFT` **no genera QR ni enlace público**. Los accesos a compartir, descargar e imprimir se
  muestran desactivados con su razón, no ocultos.
- `LOCKED_BY_PLAN` conserva los datos y el progreso. Quien escanee un código ya compartido de una
  tarjeta bloqueada ve que está temporalmente desactivada, y se le confirma que su progreso sigue
  guardado.
- La tarjeta nace `DRAFT` aunque se haya elegido un tema Pro durante el alta.

## 5. Facturación

Lite a 149 al mes o 1,490 al año. Pro a 299 al mes o 2,990 al año. El anual equivale a doce meses
con dos de descuento, llega preseleccionado y muestra su equivalente mensual debajo, para que nadie
tenga que dividir.

En el muro de pago solo se puede contratar Lite. Pro aparece atenuado, con su precio y la
explicación de cuándo estará disponible. El primer mes se cobra como Lite e incluye los beneficios
de Pro.

Al terminar ese mes se ofrece mantener Pro o continuar con Lite, enseñando cómo queda la tarjeta con
cada uno. Los códigos de esta área son `KF-BILLING-001` a `KF-BILLING-004`.

## 6. Wallet e integración

Los códigos son `KF-WALLET-001` a `KF-WALLET-003`.

| Situación | Qué ve la persona |
|---|---|
| Antes del gate | Los botones de Wallet no se muestran. No se sustituye una promesa apagada por otra |
| Generando el pase | Progreso de creación, con el nombre del proveedor |
| Sincronizando | Estado de sincronización, sin bloquear el resto de la tarjeta |
| Éxito | Confirmación por proveedor, porque Apple y Google se resuelven por separado |
| Error | Mensaje del proveedor que falló, con su código y referencia, y la tarjeta sigue usable por QR |

**Descargar y eliminar tarjeta no pertenecen a Wallet.** Comparten la etiqueta Próximamente en el
código actual, pero son del borrado del cliente y no dependen de este gate.

## 7. Estados de recuperación de acceso

Especificación para `FID-0013`. **Nada de esto se implementa en este ciclo:** esa misión está
bloqueada y depende de `FID-0004`. Se documenta ahora para que cuando se desbloquee no haya que
volver a decidirlo.

| Situación | Qué ve la persona | Código |
|---|---|---|
| Enlace de acceso expirado | Que el enlace caducó y un campo para pedir otro, con el correo ya escrito si se conoce | `KF-AUTH-002` |
| Demasiados intentos | Cuánto falta para poder reintentar, y la alternativa de entrar con Google | `KF-AUTH-003` |
| Sesión ausente o expirada | La pantalla de acceso, con una línea que explica que la sesión terminó, no un rebote mudo | `KF-AUTH-001` |
| Invitación inválida o ya usada | Que esa invitación no sirve y a quién pedirle una nueva. Nunca se revela si el negocio existe | `KF-TEAM-002` |
| Correo ya registrado | Que ya hay una cuenta con ese correo y el camino para entrar, sin confirmar si existe | `KF-TEAM-002` |
| Contraseña temporal pendiente de cambio | El cambio obligatorio, explicando por qué se pide | `KF-ACCOUNT-004` |
| Sesión sin negocio asociado | Qué pasó y a quién contactar. **Hoy esta pantalla recibe usuarios legítimos por el bug de resolución de identidad**, así que su texto no puede culpar a la persona | `KF-ACCOUNT-001` |

Regla transversal de estas siete: **ninguna revela si un correo está registrado**. La respuesta es
uniforme tanto si existe como si no.
