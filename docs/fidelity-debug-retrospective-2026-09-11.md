# Retrospectiva de depuración de Fidelity — 2026-09-11

## Sobre este documento

**La versión del 2026-09-11 nunca estuvo en Git.** Se buscó por nombre en el árbol y en toda la
historia del repositorio, incluidas las ramas, y no aparece: no hay ningún commit que la haya
añadido, modificado ni borrado. Lo que existía vivía fuera del control de versiones, así que no se
puede contrastar afirmación por afirmación con lo que decía. Este archivo la sustituye y arranca
el registro dentro de Git.

Se escribe desde FID-0025, después de que `dev` quedara en `aa73757` con la integración de las dos
ramas de trabajo.

---

## Post-integration validation — 2026-09-16

### Qué se auditó

Commit auditado: `aa73757` en `dev`, integrado en `rulaxx/1.2.0` mediante el merge `d578bdb`.

Superficies revisadas: `/onboarding` y sus componentes; `GET`, `PATCH` y `POST /api/onboarding`;
`GET` y `POST /api/subscription`; `lib/onboarding-contracts.ts`; `lib/onboarding-service.ts`;
`lib/account-lifecycle.ts`; `lib/card-themes.ts`; el esquema de Prisma y sus migraciones;
`billing:set-plan` y `onboarding:debug`; y las suites de Vitest y Playwright.

### Hallazgos de interfaz, corregidos aquí

**El alta no hablaba con su backend.** `/onboarding` guardaba el borrador en `localStorage` y
llevaba su propio flujo, mientras `OnboardingProgress` persistía paso, estado, los dos borradores,
el origen y la modalidad de cobro con `draftVersion`. La pantalla decía "tu negocio y tu tarjeta
están guardados" sin que hubiera nada en el servidor. Corregido en `e4009fc`: el estado se lee del
servidor, el borrador se autoguarda por `PATCH` y los avances van por `POST` con las acciones del
contrato.

**Las categorías eran inventadas.** La interfaz llevaba trece nombres propios. Esos trece son los
códigos de los **temas** (`fidelityThemeCodes`), no categorías de negocio: el catálogo real son las
ocho de `BusinessCategory`, que se sirven con su identificador desde `GET /api/onboarding`. Los dos
ejes estaban confundidos en la interfaz.

**El origen se mandaba como texto libre en español.** El contrato acepta `KODA_POS`, `REFERRAL`,
`SOCIAL`, `SEARCH`, `EVENT` y `OTHER`.

**Los errores no eran recuperables.** Un `401` no llevaba al acceso, un `409 Conflict` no existía
como caso y un error de servidor no enseñaba su `requestId`.

### Hallazgos de backend, entregados a Benrod

Documentados en su propia misión consolidada. En resumen:

1. **Ninguna API expone el catálogo de temas.** `LoyaltyTheme` existe, `onboardingDraftSchema`
   acepta `card.themeId` y `resolveTheme` lo resuelve, pero `GET /api/onboarding` devuelve
   `categories` y no `themes`. Sin esa lista la interfaz no puede ofrecer un selector, ni marcar
   cuáles son Pro, ni enseñar el respaldo de Lite.
2. **El catálogo no tiene ni un tema Pro.** La migración `20260910150000_fid0017_theme_catalog`
   inserta los trece con `plan = 'LITE'`, y `prisma/seed.ts` hace lo mismo. El camino Pro de
   `resolveTheme`, el `themeLocked` y el respaldo a Lite no se pueden ejercitar con datos reales.

### Información que quedó obsoleta

La nota del wireframe que decía *"marcar el onboarding como terminado pide un campo persistido;
mientras no exista, el estado se deriva de los datos y se puede ocultar por navegador"* **ya no
aplica**: el campo existe (`OnboardingProgress.status`) y el estado no se deriva ni se guarda en el
navegador.

La casilla de FID-0012 sobre el cuarto estado del alta, *"tarjeta desactivada por cambio de plan"*,
dejó de estar bloqueada: `GET /api/join` selecciona `status` y rechaza las tarjetas que no están
`ACTIVE`, así que la consulta pública ya expone lo que faltaba.

### Evidencia

| Comprobación | Resultado |
|---|---|
| `pnpm install --frozen-lockfile --ignore-scripts` | correcto |
| `pnpm db:generate` | correcto |
| `pnpm lint` | 0 errores, 19 avisos |
| `pnpm typecheck` | limpio |
| `CI=true pnpm test`, sin las de integración | 434 pruebas en 61 archivos, en verde |
| `pnpm build` | correcto |
| Pruebas de integración con PostgreSQL | **no se pueden correr en local** |

Las seis pruebas `*.integration.test.ts` fallan fuera de CI porque apuntan a la base compartida,
donde no están las migraciones nuevas: `The column TeamInvitation.authUserId does not exist in the
current database`. Aplicar migraciones en un entorno compartido está fuera del alcance de esta
misión. En CI el job `verify` levanta su propio PostgreSQL y hace `prisma migrate deploy` antes de
correrlas, que es donde cuentan.

Playwright corre en GitHub Actions, no como puerta local. El pipeline ya dispara con los PR hacia
`rulaxx/1.2.0` desde `fd4ae24`.

### Misiones

- FID-0025 — Validar e integrar onboarding y planes Lite/Pro después de la fusión (Rulaxx).
- FID-0023 — Corregir riesgos de integración de Fidelity en `benrod/1.2.0` (Benrod), ya entregada.

Sin secretos ni datos personales en este documento.
