# Integración del alta hacia dev

Objetivo: conservar las ediciones del alta, integrar el contexto del servidor y
validar el recorrido completo en CI. La promoción de los cambios pendientes de
Raúl se entrega a Raúl mediante un prompt; sus ramas no se fusionan en dev desde
esta sesión. El operador autorizó los merges de backend con pipeline limpio.

## Backend promovido

- #137 y #138 ya estaban en dev mediante #140.
- #139: head f3cad3b, base b0791dc, tres jobs exitosos antes del merge a benrod.
- #141: benrod 32658c4 hacia dev af7a195; verify, browser-smoke y auth-e2e
  exitosos en https://github.com/ZIVELO-MX/koda-fidelity-module/actions/runs/36343671793.
- Dev quedó en c634d990307d660813b8ca9802339b025c4782cd. GET/PATCH/POST del
  onboarding comparten liveContext: categories, themes y accountContext.

## Integración preparada para Raúl

La rama integration/onboarding-ready-dev incorpora los heads publicados:

- rulaxx/1.2.0: c0dda1975a9aa17b9835cd9aff993ef621e01dc7, por ascendencia.
- feat/fid-0008-autosave-visible: bcf38a3e7a2c314a058892271af1ab25379f903f.
- ci/areas-tactiles-en-browser-smoke: 307fa2f63592ec5c8daab3835db917bb1a65ddcf.
- feat/fid-0028-solicitud-activacion: a09acc142a093f8d9a4e0d664fe539a3ee9250a8.
- dev c634d99, incluido #139.

La fusión conserva ambos pasos del workflow, con onboarding-api antes del
preparador del recorrido. El finally de onboarding-api restaura negocio y
primera tarjeta, pero no todos los campos del progreso; el preparador reinicia
el progreso después. El fixture de reanudación incluye correoDeLaCuenta.

## Reproducción y arreglo de B3/B4

Sobre la integración anterior al arreglo, tres casos dirigidos fallan por
aserción (dos sustituciones del nombre local y un POST inesperado). Los otros
13 casos no se seleccionaron para esa reproducción.

La prueba del componente usa promesas controladas para dejar el primer PATCH en
vuelo, editar por segunda vez y pulsar Continuar. Comprueba valor visible,
versiones, número de peticiones y ausencia de POST cuando falla el PATCH.

La cola serializa PATCH, expone los cambios posteriores al lote para superponerlos
a la respuesta y rechaza sus consumidores cuando falla. El lote fallido vuelve a
la cola; solo un reintento explícito reanuda. Continuar vacía la cola con la última
versión confirmada y bloquea ediciones y avances duplicados mientras espera.

Guardado se muestra únicamente después de vaciar y sin ediciones en debounce.
Un conflicto conserva la edición local: reaplicar relee y guarda solo los campos
pendientes; usar el servidor pide confirmación de descarte. Ninguna resolución
repite el avance. El desmontaje detiene temporizadores y nuevos lotes.

## Cobertura durable

- browser-smoke ejecuta los verificadores de áreas y acceso en 375/768/1440.
- auth-e2e conserva el orden: auth, API real, fixture fresco, recorrido,
  paywall, precios, limpieza de solicitudes, activación manual, trial vencido
  y entitlements Lite. Las pruebas de precios consumen ahora el contrato de
  activación manual; ya no buscan Contratar ni el aviso antiguo de Pro diferido.
- La activación exige muro y API disponibles. El fixture debe iniciar sin
  solicitud y el POST debe devolver 201; folio y PENDING se confirman por GET
  después de recargar. No se acredita el escenario por un skip en CI.
- El presupuesto del job vuelve a 20 minutos. No se aumentan timeouts de pruebas
  ni se eliminan escenarios.

## Evidencia local y límites

- Regresiones del componente y cola: 26/26 pasan.
- La primera comprobación de tipos encontró un Prisma Client del head anterior;
  se generó el cliente del esquema integrado en dependencias propias del worktree.
  La comprobación posterior pasó.
- Lint: cero errores, 19 avisos preexistentes.
- La primera compilación falló al obtener fuentes de Google dentro del sandbox.
  Se repite con acceso de red, sin modificar fuentes ni configuración de build.
- PostgreSQL 17 temporal, puerto 55488: migraciones aplicadas. Ningún dato del
  Supabase existente ni de negocios reales se usa para estas pruebas.
- El build con acceso de red pasó. Suite completa y los tres jobs de la
  integración: pendientes de resultado. Los checks del backend no acreditan la integración frontend.

## Cierre requerido

Raúl incorpora la integración en su rama y promueve a dev con verify,
browser-smoke y auth-e2e exitosos en el SHA final. Después debe verificarse la
corrida de dev y la ascendencia de las cuatro ramas. Hasta entonces el frontend
integrado no se declara entregado en dev.

Contraste diferido, FID-0030 y el pago de Apple/FID-0001/FID-0002 siguen fuera de
esta integración. El API Error genérico sin reproducción permanece sin atribuir.
