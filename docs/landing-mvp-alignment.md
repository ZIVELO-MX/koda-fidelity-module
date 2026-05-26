# Alineacion de Landing con el MVP Vigente

Fecha de decision: 2026-05-25

## Objetivo

La landing debe describir el producto que esta disponible en el MVP actual:
tarjetas digitales web con QR, acceso de cliente mediante magic link y sellado
desde el dashboard del negocio.

Apple Wallet y Google Wallet no forman parte del alcance lanzable actual. Deben
permanecer visibles unicamente como integraciones **Proximamente**. Los precios
y planes comerciales aun no estan definidos.

## Estado actual que debe corregirse

La landing actual comunica capacidades que no coinciden con el roadmap:

| Area | Mensaje actual | Estado MVP real |
| --- | --- | --- |
| Hero / SEO | Apple Wallet y Google Wallet disponibles; sin cuentas | Tarjeta web con QR y acceso seguro por email |
| Como funciona | El cliente guarda en Wallet al instante | El cliente recibe un magic link y consulta su tarjeta web |
| Features | Wallet nativo y actualizaciones en tiempo real | Wallet no esta habilitado |
| Pricing | Planes, precios, limites y Wallet incluidos | Oferta comercial por definir |
| CTA | Prueba gratis / comenzar gratis | Registro publico no disponible en modo invite-only |

## Copy y comportamiento objetivo

### Hero y metadatos

- Posicionar Koda Fidelity como tarjetas digitales de lealtad con QR para
  pequenos negocios.
- Describir el flujo activo: crear tarjeta, compartir QR y registrar sellos.
- No afirmar que las tarjetas pueden agregarse a Apple Wallet o Google Wallet.
- No afirmar que el cliente no necesita cuenta o email, porque el flujo actual
  usa magic link.
- Ajustar `description`, Open Graph y Twitter metadata bajo las mismas reglas.

Mensaje de referencia:

> Tarjetas digitales de lealtad con QR para pequenos negocios. Crea tu programa,
> comparte la tarjeta y registra sellos desde Koda.

### Card preview

- Conservar el preview visual de la tarjeta en el hero.
- Presentarlo como demostracion de la tarjeta digital web disponible en el MVP.
- No agregar una etiqueta `Proximamente` al preview: la tarjeta y el QR ya
  existen en el flujo activo.

### Como funciona

El recorrido publicado debe coincidir con la aplicacion:

1. El negocio crea y personaliza una tarjeta de lealtad.
2. El cliente escanea el QR y obtiene su tarjeta mediante un enlace seguro.
3. El negocio escanea el QR del cliente y agrega o canjea sellos.

### Funciones

Funciones que pueden mostrarse como disponibles:

- Tarjetas digitales con QR.
- Branding con logo y color.
- Dashboard de clientes, tarjetas y actividad.
- Sellado y canje desde el escaner.
- Portal de tarjetas del cliente mediante magic link.

Funcion futura visible:

- `Apple Wallet y Google Wallet - Proximamente`.
- La descripcion no debe prometer pases, sincronizacion o disponibilidad
  mientras los botones sigan deshabilitados.

### Pricing

- Reemplazar las tarjetas `Gratis`, `Pro` y `Premium`, sus montos, limites y
  listas de beneficios por un solo bloque informativo.
- Titulo: `Precios por definir`.
- Descripcion: indicar que la oferta comercial se publicara proximamente.
- No renderizar CTA de compra, prueba gratis ni registro desde esta seccion.

### Navegacion y CTA

- Eliminar CTAs publicos que llevan a `/signup`, incluidos `Comenzar`,
  `Prueba Gratis` y `Comenzar Gratis`.
- Conservar `Iniciar Sesion` con destino `/login` para negocios invitados.
- La navegacion puede conservar el enlace a `#pricing`, que ahora conduce al
  bloque informativo de precios.

## Superficies a actualizar durante la implementacion

| Superficie | Cambio esperado |
| --- | --- |
| `lib/site-config.ts` | Sustituir promesas, features, pricing y CTA por contenido alineado |
| `app/page.tsx` | Retirar enlaces de alta publica y renderizar el estado informativo de pricing/Wallet |
| `components/landing-mobile-nav.tsx` | Retirar `Comenzar` y mantener login |
| `app/join/[cardId]/layout.tsx` | Quitar Wallet de la descripcion social de la tarjeta |
| `README.md` | Describir el MVP web y marcar Wallet como proximo |
| `docs/idea.md` | Registrar la definicion vigente del MVP o reemplazar la especificacion anterior |

## Fuera de alcance

- Habilitar Apple Wallet o Google Wallet.
- Cambiar el flujo magic link o abrir registro publico.
- Definir precios, planes o limites comerciales.
- Modificar endpoints de pases existentes.

## Criterio de finalizacion

La alineacion estara terminada cuando ninguna superficie publica prometa Wallet
activo, flujo sin email, registro abierto o precios publicados, y la landing
comunique de forma clara el MVP basado en QR y magic link.
