# Auditoria de botones y datos hardcodeados

Fecha de revision: 2026-05-24  
Proyecto: Koda Fidelity Module  
Revision auditada: worktree de `feat/openapi-support` con cambios locales preexistentes/no incluidos en este reporte.  
Alcance: pantallas propias en `app/`, componentes funcionales en `components/`,
acciones/API en `lib/` y `app/api/`, configuracion, schema y datos semilla.

## Resumen ejecutivo

La interfaz contiene controles visibles que no ejecutan ninguna accion, funciones
conectadas que descartan los datos editados y flujos principales que no llegan a
la funcionalidad ya implementada en backend.

| Severidad | Cantidad | Impacto principal |
| --- | ---: | --- |
| Critica | 2 | Wallet anunciado pero inaccesible; lectura publica de datos de clientes |
| Alta | 5 | Flujo de union roto para cliente existente; configuracion y branding aparentan guardar datos que se pierden; busquedas principales inertes |
| Media | 9 | CTAs bloqueados por beta, menus/botones muertos, descarga QR incorrecta y controles sin feedback |
| Baja | 5 | Links placeholder, datos demo presentados como reales y deuda de verificacion |

## Metodologia y limites

- Se trazo cada control interactivo propio hasta su handler, server action o endpoint.
- Se revisaron las funciones de API, persistencia Prisma, autenticacion Supabase y
  generacion de pases Wallet que soportan los botones.
- Se contrastaron formularios y botones con las guias locales
  `modern-web-guidance` (`forms`, `declarative-button-actions`,
  `accessible-error-announcement`) y Web Interface Guidelines.
- La comprobacion es estatica y mediante build/tests. No se realizo una sesion
  manual autenticada en navegador ni pruebas contra un proyecto Supabase remoto.

## Fallos criticos y altos

### F-01 - Critica - Los botones Wallet estan permanentemente bloqueados aunque existen endpoints

**Ubicaciones:** `app/join/[cardId]/page.tsx:298`,
`app/join/[cardId]/page.tsx:309`, `app/api/passes/apple/[cardId]/route.ts:5`,
`app/api/passes/google/[cardId]/route.ts:10`, `lib/site-config.ts:64`

**Evidencia:** La vista del cliente renderiza `Apple Wallet - Proximamente` y
`Google Wallet - Proximamente` con `disabled`, sin handler. Sin embargo existen
rutas POST para generar ambos pases y la landing promete integracion nativa y
guardado en Wallet.

**Impacto:** La funcion central anunciada al usuario no puede iniciarse desde la
interfaz. Ningun cliente puede agregar su tarjeta a Wallet desde el flujo normal.

**Adicional:** Los endpoints actualmente crean un `Customer` nuevo con solo
`customerName` (`apple route.ts:32`, `google route.ts:48`) en lugar de generar el
pase para el cliente ya registrado en `/join`. Conectar los botones directamente
duplicaria clientes y perderia la asociacion por email.

**Correccion recomendada:** Cambiar las rutas para operar sobre el `customer.id`
ya autenticado/autorizado y conectar botones reales con estados de carga/error;
mostrar indisponibilidad solo cuando falte configuracion del proveedor.

### F-02 - Critica - El QR de cliente expone sus datos sin autenticacion

**Ubicaciones:** `components/loyalty-card-preview.tsx:140`,
`app/dashboard/scan/page.tsx:67`, `app/api/join/route.ts:66`

**Evidencia:** La tarjeta del cliente codifica `customer.id` como QR. El escaner
consulta `GET /api/join?id=<customerId>`, y esa rama no llama
`getBusinessFromSession()` ni comprueba el usuario. Devuelve nombre, sellos,
recompensa y datos de marca del cliente a cualquier solicitante que tenga/fotografie
el QR.

**Impacto:** Un QR pensado para el empleado funciona como endpoint publico de
informacion personal y progreso de fidelidad.

**Correccion recomendada:** Requerir sesion de negocio y verificar que el cliente
pertenece a una tarjeta del negocio; separar el endpoint publico de alta del endpoint
privado de escaneo.

### F-03 - Alta - Un cliente autenticado existente no es reconocido al abrir su tarjeta

**Ubicaciones:** `app/join/[cardId]/page.tsx:77`,
`app/join/[cardId]/page.tsx:83`, `app/api/join/route.ts:85`

**Evidencia:** `init()` consulta por `email` y `cardId`, pero lee
`data.customer`. El endpoint responde `{ customers: [...] }`. La condicion nunca
se cumple para una tarjeta ya existente.

**Impacto:** El usuario con sesion activa vuelve al formulario en vez de ver su
tarjeta y puede solicitar OTP innecesariamente. El camino alterno solo funciona si
existe un id pendiente en `sessionStorage`.

**Correccion recomendada:** Consumir `data.customers[0]` o cambiar el contrato del
endpoint para consulta por tarjeta y cubrirlo con una prueba de integracion.

### F-04 - Alta - Configuracion aparenta persistir siete controles, pero solo guarda el nombre

**Ubicaciones:** `app/dashboard/(main)/settings/page.tsx:29`,
`app/dashboard/(main)/settings/page.tsx:82`,
`app/dashboard/(main)/settings/page.tsx:87`,
`app/dashboard/(main)/settings/page.tsx:91`,
`app/dashboard/(main)/settings/page.tsx:127`,
`app/dashboard/(main)/settings/page.tsx:149`,
`app/api/business/route.ts:23`

**Evidencia:** `handleSave()` envia unicamente `{ name: businessName }`.
`businessType`, `address`, `phone`, `website`, `instagram` y las tres
preferencias de notificacion son inputs editables sin estado persistente ni
campos correspondientes en `Business`.

**Impacto:** El boton **Guardar Cambios** confirma guardado aunque pierde casi
toda la informacion que el usuario cambio.

**Correccion recomendada:** Ocultar/inhabilitar campos aun no soportados, o modelar,
validar y enviar todos los campos antes de mostrar confirmacion.

### F-05 - Alta - Subir Logo no ejecuta nada y el logo persistido no se previsualiza en Branding

**Ubicaciones:** `app/dashboard/(main)/branding/page.tsx:21`,
`app/dashboard/(main)/branding/page.tsx:33`,
`app/dashboard/(main)/branding/page.tsx:89`,
`app/api/business/route.ts:28`

**Evidencia:** El boton **Subir Logo** no tiene `onClick`, `input type="file"` ni
upload. Aunque `logoUrl` se lee y el endpoint admite guardarlo, la pantalla nunca
lo cambia y la vista previa siempre muestra una inicial, no una imagen.

**Impacto:** Personalizacion de logo anunciada en precios no es utilizable.

**Correccion recomendada:** Implementar seleccion/upload y render de `logoUrl`, o
retirar la accion y la promesa hasta estar disponible.

### F-06 - Alta - Las busquedas visibles del dashboard y de Clientes no funcionan

**Ubicaciones:** `components/dashboard/header.tsx:13`,
`app/dashboard/(main)/customers/page.tsx:53`, `app/api/customers/route.ts:9`

**Evidencia:** Ambos `<Input>` solo renderizan placeholder; no tienen estado,
submit, URL ni handler. El endpoint `/api/customers?q=` ya soporta filtrar, pero
la pagina de clientes es server-rendered y no lo utiliza.

**Impacto:** El usuario escribe y no cambia ningun resultado. En Clientes se
presenta explicitamente una funcion inexistente.

**Correccion recomendada:** Implementar busqueda en query string/server page o
cliente debounced, y remover la busqueda global hasta definir su alcance.

### F-07 - Alta - Registro permite avanzar con datos vacios y el nombre de negocio editado se descarta

**Ubicaciones:** `app/dashboard/(main)/cards/new/page.tsx:31`,
`app/dashboard/(main)/cards/new/page.tsx:45`,
`app/dashboard/(main)/cards/new/page.tsx:61`,
`app/dashboard/(main)/cards/new/page.tsx:237`, `app/api/cards/route.ts:44`

**Evidencia:** **Continuar** cambia de paso sin validar nombre/recompensa. En el
ultimo paso, la API rechaza vacios mediante un `alert`. Ademas, el campo
`businessName` se edita y aparece en revision/vista previa, pero no se incluye en
el POST; la tarjeta real obtiene el negocio persistido.

**Impacto:** Flujo engañoso: el usuario puede revisar un diseno que no sera el
guardado y descubre errores obligatorios solo al final.

**Correccion recomendada:** Quitar el campo local de negocio o persistirlo de
forma explicita; validar al avanzar y mostrar errores inline.

## Fallos medios y bajos

| ID | Sev. | Control o funcion | Evidencia | Fallo |
| --- | --- | --- | --- | --- |
| F-08 | Media | Menu de tarjeta | `app/dashboard/(main)/cards/page.tsx:81` | Boton `MoreVertical` sin `onClick`, enlace ni menu. |
| F-09 | Media | Menu de cliente | `app/dashboard/(main)/customers/page.tsx:150` | Boton de acciones por fila no ejecuta ninguna accion. |
| F-10 | Media | Notificaciones | `components/dashboard/header.tsx:23` | Campana es boton sin handler, ruta ni panel; el punto de pendiente es fijo. |
| F-11 | Media | Documentacion | `components/dashboard/sidebar.tsx:109` | **Ver Documentacion** no tiene destino ni accion. |
| F-12 | Media | Cambiar password | `app/dashboard/(main)/settings/page.tsx:180` | Boton no dispara flujo Supabase ni navegacion. |
| F-13 | Media | Descargar QR | `app/dashboard/(main)/qr-codes/page.tsx:55`, `prisma/schema.prisma:26` | El DOM id usa `card.name`, que no es unico; dos tarjetas con el mismo nombre descargan el primer QR encontrado. Debe usar `card.id`. |
| F-14 | Media | Copiar URL | `app/dashboard/(main)/qr-codes/page.tsx:30` | Muestra `Copiado` sin esperar ni capturar rechazo de `navigator.clipboard.writeText`; en contexto no seguro/permisos denegados reporta exito falso. |
| F-15 | Media | Eliminar tarjeta | `components/dashboard/card-actions.tsx:18` | Si DELETE falla no informa nada; el boton parece no funcionar. |
| F-16 | Baja | Footer legal/soporte | `lib/site-config.ts:171` | Privacidad, Terminos y Soporte apuntan a `#`, por lo que los tres links no llevan a contenido. |
| F-17 | Baja | Link de queja 404 | `app/not-found.tsx:61` | Enlace de soporte apunta a `#`; no realiza accion. |
| F-18 | Baja | Estado de guardado | `app/dashboard/(main)/settings/page.tsx:186` | A diferencia de Branding, el boton guardar no se deshabilita durante PUT; admite envios repetidos. |
| F-19 | Baja | Accesibilidad de botones icono | `components/dashboard/sidebar.tsx:43`, `components/dashboard/header.tsx:23`, `app/dashboard/(main)/cards/page.tsx:81`, `app/dashboard/(main)/customers/page.tsx:151`, `app/dashboard/(main)/qr-codes/page.tsx:129`, `app/dashboard/scan/page.tsx:279` | Botones solo icono carecen de `aria-label`; el control puede resultar inoperable para lector de pantalla. |
| F-20 | Baja | Overlays moviles | `components/landing-mobile-nav.tsx:28`, `components/dashboard/sidebar.tsx:53` | Un `div` con `onClick` cierra el panel pero no admite operacion por teclado; debe ser control semantico o manejar foco/teclado. |
| F-21 | Media | CTA de alta publica | `app/page.tsx:113`, `lib/site-config.ts:110`, `app/signup/page.tsx:7`, `lib/config.ts:1` | **Prueba Gratis**, los CTA de planes y **Comenzar Gratis** apuntan a `/signup`, pero la configuracion efectiva cierra el registro salvo `INVITE_ONLY=false`; `.env` no lo define y la pantalla muestra beta privada. |

## Revision funcion por funcion

### Navegacion publica y autenticacion

| Funcion/control | Archivo | Estado | Datos fijos o observacion |
| --- | --- | --- | --- |
| `LandingPage` CTAs y anclas | `app/page.tsx:41` | Navegacion conectada; alta bloqueada por defecto y links del footer fallan (F-21/F-16) | Copys, precios y demos vienen de `siteConfig`; fecha demo fija en linea 148. |
| `LandingMobileNav` | `components/landing-mobile-nav.tsx:14` | Links conectados; overlay con limitacion de teclado (F-20) | Lista de tres anclas fija. |
| `LoginForm` / `login` | `components/auth/login-form.tsx:13`, `lib/actions/auth.ts:12` | Conectado a Supabase password | Texto y placeholders fijos; errores dependen del proveedor. |
| `SignupForm` / `signup` | `components/auth/signup-form.tsx:14`, `lib/actions/auth.ts:28` | Conectado solo si `INVITE_ONLY=false` | Por defecto `INVITE_ONLY` distinto de `"false"` bloquea registro (`lib/config.ts:1`). |
| `AuthErrorContent.handleResend` | `app/auth/error/page.tsx:88` | Conectado a OTP | Cooldown local fijo de 90 s/60 s y redireccion siempre a `/my-cards`. |
| `MyCardsPage.handleSubmit` | `app/my-cards/page.tsx:120` | Conectado a OTP | Cooldown fallback fijo de 90 s. |
| `JoinCardPage.init/handleSubmit` | `app/join/[cardId]/page.tsx:64`, `:158` | Roto para cliente existente (F-03) | Botones Wallet bloqueados (F-01); cooldown fijo. |
| `NotFound` | `app/not-found.tsx:5` | Home/dashboard conectados; contacto falla (F-17) | Copy ilustrativo fijo. |

### Dashboard

| Funcion/control | Archivo | Estado | Datos fijos o observacion |
| --- | --- | --- | --- |
| `DashboardPage` | `app/dashboard/(main)/page.tsx:22` | Lectura Prisma funcional | Preview inferior usa `"Cliente Feliz"`, `7/10`, `"Recompensa Gratis"` y `"Dec 31, 2026"`; no representa tarjeta real. |
| Header busqueda/campana | `components/dashboard/header.tsx:8` | Rotos (F-06, F-10) | Avatar `"JD"` y badge de notificacion constantes. |
| Sidebar navegacion/logout | `components/dashboard/sidebar.tsx:29` | Rutas/logout conectados; docs roto (F-11) | Navegacion fija; soporte sin destino. |
| `CardsPage` | `app/dashboard/(main)/cards/page.tsx:8` | Crear/detalles/QR conectados; menu roto (F-08) | Estado `"Activa"` y conteo QR `1` siempre fijos. |
| `CreateCardPage.updateFormData/handleCreate` | `app/dashboard/(main)/cards/new/page.tsx:41`, `:55` | Crea tarjeta, con perdida/validacion tardia (F-07) | Sellos disponibles `[5,8,10,12,15]`, seis colores, negocio y cliente demo. |
| `CardDetailPage` / `CardActions.handleDelete` | `app/dashboard/(main)/cards/[id]/page.tsx:21`, `components/dashboard/card-actions.tsx:15` | Detalle y borrado conectados; fallo DELETE silencioso (F-15) | Sin datos demo relevantes. |
| `CustomersPage` | `app/dashboard/(main)/customers/page.tsx:21` | Lista funcional; busqueda y menu rotos (F-06, F-09) | Sin datos demo, salvo etiquetas. |
| `QRCodesPage.copyToClipboard/downloadQR` | `app/dashboard/(main)/qr-codes/page.tsx:15`, `:30`, `:36` | Rutas funcionales con defectos (F-13, F-14) | Canvas PNG fijo `400x500`; imprime toda la pagina mediante `window.print()`. |
| `BrandingPage.handleSave` | `app/dashboard/(main)/branding/page.tsx:18`, `:40` | Nombre/color guardan; logo roto (F-05) | Seis presets y preview de cinco sellos con tres llenos. |
| `SettingsPage.handleSave` | `app/dashboard/(main)/settings/page.tsx:9`, `:29` | Guardado parcial engañoso (F-04, F-12, F-18) | `"Coffee Shop"`, direccion, telefono y preferencias iniciales son valores fijos. |
| `ScanPage.handleScanResult/addStamp` | `app/dashboard/scan/page.tsx:67`, `:94` | Botones conectados a endpoints | Depende del endpoint publico inseguro (F-02); QR scanner solo acepta texto de longitud mayor a 10. |
| `QRScanner` | `components/scan/qr-scanner.tsx:11` | Activa camara y devuelve id | `fps=10`, caja `250x250` y condicion de longitud fija. |

### Endpoints, servicios y persistencia

| Funcion | Archivo | Estado/impacto | Valores fijos relevantes |
| --- | --- | --- | --- |
| `GET/POST /api/cards` | `app/api/cards/route.ts:5`, `:38` | Protegido por negocio; soporta crear tarjetas | Default `stampsRequired=10`; valida rango `1..100`. |
| `GET/PUT/DELETE /api/cards/[id]` | `app/api/cards/[id]/route.ts:5`, `:44`, `:88` | GET publico necesario para join; mutaciones protegidas | PUT no tiene UI de editar actualmente. |
| `GET/PUT /api/business` | `app/api/business/route.ts:5`, `:14` | Protegido; API soporta `logoUrl`, UI no | Solo schema de `name`, color y logo. |
| `GET /api/customers` | `app/api/customers/route.ts:5` | Protegido y soporta `q`; Customers no lo usa | Sin datos demo. |
| `POST /api/stamps` | `app/api/stamps/route.ts:5` | Protegido y valida pertenencia de negocio | Tipos permitidos tratados como `"stamp"`/`"redeem"`. |
| `POST/GET /api/join` | `app/api/join/route.ts:18`, `:59` | POST publico esperado; GET por id inseguro y contrato no consumido correctamente (F-02/F-03) | Validacion de email solo comprueba que contenga `@`. |
| `POST Apple pass` | `app/api/passes/apple/[cardId]/route.ts:5` | Sin UI; crea cliente adicional; error TypeScript | Nombre de descarga `koda-<cardId>.pkpass`. |
| `POST Google pass` | `app/api/passes/google/[cardId]/route.ts:10` | Sin UI; crea cliente adicional; requiere configuracion | Host fallback `localhost:3000`, protocolo fallback `http`. |
| `generateLoyaltyPass` | `lib/passes/apple.ts:97` | Implementacion no alcanzable desde UI | Identificador fallback `pass.com.koda.fidelity`, colores blancos y assets fallback. |
| `generateLoyaltyPassJwt` | `lib/passes/google.ts:75` | Implementacion no alcanzable desde UI | Clases/labels/imagenes y seleccion de hero limitadas a naranja/azul. |
| `getBusinessFromSession` | `lib/api-utils.ts:26` | Protege endpoints de negocio correctamente | Identidad se vincula por email. |
| `authService` | `lib/auth-service.ts:4` | Login/signup/logout conectados | Nombre se almacena en metadata Supabase; no se usa como autorizacion. |
| `ServiceWorkerRegister` / SW | `components/service-worker-register.tsx:5`, `public/sw.js:1` | Registra cache global | Precarga rutas privadas de dashboard y cachea GET autenticados; revisar fuga/staleness en dispositivo compartido. |

## Datos hardcodeados y promesas no respaldadas

| Categoria | Ubicacion | Valor o promesa fija | Riesgo |
| --- | --- | --- | --- |
| Landing demo | `lib/site-config.ts:31`, `app/page.tsx:143`, `components/loyalty-card-preview.tsx:31` | The Daily Grind, Free Coffee, `6/10`, fecha `"Dec 31, 2026"` y QR por defecto `https://koda.app/card/demo` | Correcto como demo, pero mezcla ingles/espanol y fecha/QR fijos. |
| Pricing/marketing | `lib/site-config.ts:64`, `:110` | Wallet disponible, limites/precios/analiticas/soporte | Wallet no accesible y limites de planes no se aplican en APIs. |
| Footer | `lib/site-config.ts:171` | Tres `href: "#"` | Acciones visibles no funcionan. |
| Dashboard preview | `app/dashboard/(main)/page.tsx:217` | Cliente Feliz, `7/10`, recompensa y vencimiento fijos | Parece informacion del negocio autenticado sin serlo. |
| Tarjetas | `app/dashboard/(main)/cards/page.tsx:78`, `:118` | Siempre Activa y siempre 1 QR | No existe estado de activacion ni conteo real. |
| Nueva tarjeta | `app/dashboard/(main)/cards/new/page.tsx:13`, `:19`, `:31` | Pasos, colores, negocio `Tu Negocio`, defaults y cliente demo | Parte es opcion UX; `businessName` es dato editable descartado. |
| Branding | `app/dashboard/(main)/branding/page.tsx:9`, `:177` | Colores y cinco sellos/tres activos | Preview no refleja una tarjeta almacenada. |
| Settings | `app/dashboard/(main)/settings/page.tsx:83`, `:88`, `:92`, `:149` | Tipo, direccion, telefono y switches | Se presentan como datos editables persistibles pero son ficticios. |
| Header | `components/dashboard/header.tsx:23`, `:27` | Notificacion pendiente y avatar JD | No deriva de sesion ni eventos. |
| Semilla | `prisma/mock-data.ts:1` | Dos negocios y cinco clientes demo | Adecuado para seed, no debe mezclarse con produccion. |
| Defaults de schema | `prisma/schema.prisma:14`, `:28`, `:29` | Colores `#ff6b35`, 10 sellos | Distinto al default UI `#f97316`; crea inconsistencia visual si falta payload. |
| Config registro | `lib/config.ts:1`, `.env.example:11` | Registro bloqueado salvo `INVITE_ONLY=false`; `.env` efectivo no declara la variable | CTAs publicos conducen a beta privada en la configuracion revisada (F-21). |
| Assets/credencial | `certificates/google-service-account.json` | Archivo con nombre de credencial versionado | Verificar que sea placeholder; una key real no debe estar en Git. |

## Calidad, compilacion y cobertura

| Verificacion | Resultado | Hallazgo |
| --- | --- | --- |
| `pnpm test` | Pasa | 11 archivos, 84 pruebas exitosas. No cubre botones del dashboard, Wallet, Branding, Settings, QR ni contrato UI/API de join. |
| `pnpm lint` | Falla | `eslint: not found`; el script existe pero falta instalar/declarar ESLint. |
| `pnpm exec tsc --noEmit` | Falla | Error funcional en `app/api/passes/apple/[cardId]/route.ts:47` y errores adicionales en primitives UI. |
| `pnpm run build` | Pasa con advertencias | `next.config.mjs:3` establece `ignoreBuildErrors: true`, por lo que oculta errores TS; Turbopack advierte traza amplia desde `lib/passes/google.ts`. |

## Priorizacion de correcciones

1. Proteger `GET /api/join?id` y decidir el contrato autenticado del QR de cliente.
2. Replantear Wallet sobre clientes existentes, conectar los botones y retirar
   promesas no disponibles mientras no exista flujo completo.
3. Corregir el contrato `{ customers }`/`customer` del flujo `/join/[cardId]` y
   añadir pruebas de usuario ya registrado.
4. No mostrar confirmacion de Settings/Branding para campos que no se guardan;
   implementar upload, password y preferencias o retirar controles.
5. Alinear los CTA publicos con el modo beta o habilitar el registro de la prueba anunciada.
6. Implementar o retirar busquedas, menus de acciones, campana y documentacion.
7. Reparar typecheck/lint y evitar que el build oculte errores antes de liberar.

## Referencias consultadas

- Web Interface Guidelines: <https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md>
- Modern Web Guidance, guias `forms`, `declarative-button-actions` y
  `accessible-error-announcement`, consultadas mediante CLI el 2026-05-24.
- Checklist local Supabase: `.agents/skills/supabase/SKILL.md`.
