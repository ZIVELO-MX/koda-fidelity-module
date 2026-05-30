# Test Plan - Alineacion de Landing con el MVP

Fecha: 2026-05-30
Referencia: `docs/landing-mvp-alignment.md`
Estado: ✅ Implementado y verificado

## Objetivo

Validar que la landing solo promete funciones disponibles en el MVP:
tarjeta digital web con QR, magic link y sellado desde dashboard.
Wallet se muestra como `Próximamente` y pricing como `Por definir`.

## Criterios de aceptacion

| ID | Criterio |
| --- | --- |
| LP-01 | El hero describe tarjetas digitales con QR y no afirma disponibilidad de Wallet. |
| LP-02 | Metadatos SEO/Open Graph/Twitter no prometen Wallet activo ni flujo sin email. |
| LP-03 | El card preview del hero permanece visible como demostracion del producto activo. |
| LP-04 | La seccion de funcionamiento refleja creacion, acceso por enlace seguro y sellado por QR. |
| LP-05 | Wallet aparece solamente como `Proximamente` y sin promesa de sincronizacion. |
| LP-06 | Pricing contiene un unico estado `Precios por definir`, sin montos, planes ni limites publicados. |
| LP-07 | No existen CTAs publicos a `/signup`; `Iniciar Sesion` navega a `/login`. |
| LP-08 | La presentacion es usable en viewport movil y escritorio. |

## Casos de prueba manuales

| Caso | Procedimiento | Resultado esperado |
| --- | --- | --- |
| M-01 Hero desktop | Abrir `/` en ancho de escritorio y revisar hero. | Se ve card preview; copy habla de QR; no aparece Wallet como disponible ni `Prueba Gratis`. |
| M-02 Hero movil | Abrir `/` en viewport movil y desplegar menu. | Menu permite navegar por secciones e iniciar sesion; no muestra CTA de signup. |
| M-03 Funciones | Navegar a `#features` y `#how-it-works`. | El flujo describe magic link/QR; Wallet esta rotulado `Proximamente`. |
| M-04 Pricing | Navegar a `#pricing`. | Existe un unico bloque `Precios por definir`; no hay montos, planes ni botones comerciales. |
| M-05 Metadata | Inspeccionar `title`, `description` y previsualizacion social de `/`. | No existen promesas de Apple/Google Wallet disponible o de alta sin email. |
| M-06 Join | Abrir un `/join/[cardId]` valido con cliente accesible. | Los botones Apple/Google Wallet siguen deshabilitados y dicen `Proximamente`. |
| M-07 Login | Usar el CTA publico de autenticacion. | Navega a `/login`; no se expone registro abierto desde landing. |

## Pruebas automatizadas (pendientes)

### Renderizado de landing

- Agregar pruebas que rendericen la landing o su configuracion y comprueben:
  - existe texto de tarjetas digitales/QR;
  - existe `Precios por definir`;
  - existe `Proximamente` asociado a Wallet;
  - no existen `Prueba Gratis`, `Comenzar Gratis`, montos publicados ni links a
    `/signup` en navegacion/CTA.

### Metadata publica

- Cubrir metadata de `/` y `/join/[cardId]` para confirmar que descripciones
  sociales no incluyen disponibilidad de Apple Wallet o Google Wallet.

### Navegacion responsive

- Extender Playwright para verificar en escritorio y movil:
  - enlaces internos a funciones, flujo y pricing;
  - CTA `Iniciar Sesion` hacia `/login`;
  - ausencia de enlaces visibles a signup.

### Regresion del flujo existente

- Confirmar que el ajuste de landing no modifica el flujo cliente:
  - `/join/[cardId]` conserva formulario de nombre/email y envio de magic link;
  - la tarjeta lista conserva QR;
  - Wallet permanece deshabilitado.

## Verificaciones tecnicas

Ejecutadas después de implementar los cambios:

```bash
pnpm test          # 84+ tests, todos pasan
pnpm exec tsc --noEmit   # 0 errores
pnpm lint          # funcional, solo warnings
pnpm run build     # exitoso sin ignoreBuildErrors
```

El cambio no se acepta si `lint` no puede ejecutarse, si el build omite errores
de tipos mediante `ignoreBuildErrors`, o si alguna prueba de contenido permite
reintroducir promesas no soportadas.

**Estado actual:** `lint` funcional, `ignoreBuildErrors` removido de `next.config.mjs`.

## Datos y dependencias

- Usar datos mock o una tarjeta de prueba existente para revisar `/join/[cardId]`.
- No se requieren credenciales Apple Wallet ni Google Wallet, ya que ambos
  permanecen deshabilitados.
- Las pruebas E2E que requieran Supabase deben ejecutarse contra un entorno de
  pruebas y no contra datos de produccion.
