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


---

## Contraste de la tarjeta de lealtad — anotado el 2026-09-18

**No es un hallazgo de los temas: es anterior a ellos y afecta a todas las tarjetas del producto.**
Se anota aquí en vez de abrir misión, por decisión de Raúl.

`components/loyalty-card-preview.tsx` pinta el texto en blanco fijo (`const fg = "#ffffff"`) sobre
el color del negocio. Contra el punto más claro del degradado base, medido con la fórmula de
contraste de WCAG:

| Color de marca | Blanco sobre el punto más claro |
|---|---|
| `#c2410c` | 4.00:1 |
| `#ff6b35` | 2.43:1 |
| `#0d9488` | 3.00:1 |

El mínimo AA para texto pequeño es 4.5:1. Ninguno llega, y el naranja de KODA por defecto se queda
en menos de la mitad.

El ADN ya lo anticipaba para los temas -- *"contraste a verificar por categoría; es donde se cuela
un texto ilegible"* -- pero el problema no viene del tema: viene de fijar el primer plano en blanco.
`lib/color-marca.ts` ya tiene `derivarMarca`, que calcula un color de texto legible sobre un color
de marca arbitrario, y el panel lo usa. La tarjeta no.

**Por qué no se arregla de paso.** Cambiar el primer plano cambia el aspecto de todas las tarjetas
ya publicadas, en el panel, en el alta pública y en el portal del cliente. Es una decisión de
diseño con alcance de producto, no un ajuste dentro de una misión de temas.

**Lo que sí se hizo:** que la capa de temas no lo empeore. La primera versión de las pieles aclaraba
la base de 0.16 a 0.22 -- 3.60:1 con `#c2410c` --; se revirtió, y ahora ningún acabado aclara por
encima de la base original. La diferencia entre acabados sale del tono y de la textura.

### Medido sobre la paleta que el usuario elige — 2026-09-22

Los tres colores de arriba eran ejemplos. Estos son los seis que ofrece de verdad el asistente de
tarjetas, que es lo que un negocio puede elegir con un clic. Blanco sobre el punto más claro del
degradado, sobre el color base y sobre el punto más oscuro:

| Color | Punto claro | Base | Punto oscuro |
|---|---|---|---|
| `#f97316` naranja KODA | 2.41 | 2.80 | 4.41 |
| `#3b82f6` azul | 2.94 | 3.68 | 5.62 |
| `#10b981` verde | 2.21 | 2.54 | 4.04 |
| `#8b5cf6` morado | 3.29 | 4.23 | 6.31 |
| `#ec4899` rosa | 2.96 | 3.53 | 5.43 |
| `#f59e0b` ámbar | 1.90 | 2.15 | 3.47 |

Ninguno llega a 4.5 en el punto claro, que es justo donde el degradado coloca la esquina superior
izquierda: el nombre del negocio. Cuatro de los seis tampoco alcanzan 3.0, el mínimo para texto
grande. El ámbar es el peor en las tres columnas. El acabado foil resta otro 8-12% porque su velo
añade blanco.

Sigue sin arreglarse por la misma razón de arriba, y sigue siendo decisión de Raúl. La medición se
anota para que esa decisión se tome con los números de la paleta real.

**Si se decide abordarlo**, el camino más corto es usar `derivarMarca(brandColor).texto` como primer
plano de la tarjeta y verificar los trece giros más los cuatro acabados, que es exactamente el
barrido que pide el ADN.
