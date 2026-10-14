# Evidencia de FID-0022 para FID-0021

Ligada a `rulaxx/1.2.0` en **`18d5189ee396be2bdf9fae8cb8ef03f929dc159f`**. Este documento se añade en el commit siguiente, así que
su propio SHA es el hijo del que aquí se mide; todo lo demás corresponde al de arriba.

## Entorno

| | |
|---|---|
| Sistema | macOS (darwin 25.6.0), arm64 |
| Node | v24.14.0 |
| pnpm | 11.9.0 |
| Playwright | 1.60.0, Chromium |
| Base de datos | Supabase de desarrollo **compartida**, no aislada |
| Supabase local | **no disponible**: esta máquina no tiene Docker instalado |

## Resultados

| Comando | passed | failed | skipped |
|---|---|---|---|
| `pnpm exec tsc --noEmit` | 1 | 0 | 0 |
| `pnpm lint` | 0 errores | 0 | 19 avisos preexistentes |
| `pnpm vitest run --exclude '**/*.integration.test.ts'` | 488 en 72 archivos | 0 | 0 |
| `pnpm vitest run` sobre los siete `*.integration.test.ts` | 2 | 0 | 15 (6 de 7 archivos) |
| `pnpm build` | 1 | 0 | 0 |
| `playwright test ola-1 ola-4 areas-tactiles-acceso` (375/768/1440) | 49 | 0 | 0 |
| `playwright test ola-1-con-sesion` (375/768/1440) | parcial | 1 | 0 |

## Lo que estos números **no** demuestran

Esto es lo que FID-0021 tiene que saber antes de tratarlos como compatibilidad.

**Un mock verde no es el servidor.** De las 488 pruebas unitarias, las de los consumidores corren
contra `fetch` sustituido. Fijan que la pantalla trata bien cada forma del contrato, no que el
servidor devuelva esa forma. Lo que sí cruza esa frontera son las de integración, y de esas **seis
de siete archivos se saltaron** en esta máquina por falta de entorno aislado: solo dos pruebas
tocaron una base real.

**Tres anchos no son tres dispositivos.** Las 49 de Playwright corren en un solo Chromium
redimensionado. Prueban que el diseño responde a 375, 768 y 1440, no que funcione en Safari de iOS
ni en un Android real. Ningún navegador de los que usan los clientes entró en esta medición.

**El recorrido con sesión no se completó.** `ola-1-con-sesion` falló una vez, y no por las
pantallas: el spec vuelve a iniciar sesión en cada `beforeEach`, así que doce inicios seguidos
contra el mismo Supabase acaban limitados y `waitForURL` agota sus 60 s. Las mismas aserciones
pasan cuando el spec se corre acotado. Es una limitación del arnés y queda anotada como tal.

**Tres escenarios no se ejecutaron nunca aquí.** Los de vencimiento del mes Pro, transición a Lite y
respaldo del tema Pro necesitan Supabase local, y sin Docker no hay forma. Se verifican en CI o no
se verifican.

**Y la mayoría de los specs no los corre nadie.** CI ejecuta cinco: `auth-errors`, `auth-ui`,
`update-password`, `auth-development`, `onboarding-recorrido` y `planes`. `ola-1`, `ola-2`,
`ola-3`, `ola-4`, `ola-1-con-sesion`, `areas-tactiles-acceso` y `navegacion` **no están en
ningún job**, y CI tampoco define `E2E_EMAIL` ni `E2E_PASSWORD`, así que aunque se añadieran se
saltarían. Todo lo que este documento mide de esos specs se midió a mano.

## Comandos, para repetirlo

```bash
git checkout 18d5189ee396be2bdf9fae8cb8ef03f929dc159f
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm db:generate
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm vitest run --exclude '**/*.integration.test.ts'
corepack pnpm build
corepack pnpm exec playwright test e2e/ola-1.spec.ts e2e/ola-4.spec.ts e2e/areas-tactiles-acceso.spec.ts
```

Los specs con sesión piden además `E2E_EMAIL` y `E2E_PASSWORD` de una cuenta admin, y el servidor
en el puerto que espere el config.
