# FID-0014 — validación preliminar de integración

Estado: draft, no apto para merge.

## Combinación evaluada

- Base: `origin/benrod/1.2.0` (`a15f5ee`)
- Diseño: `origin/rulaxx/1.2.0` (`8f63987`)
- Rama: `integration/fid-0014-design-draft`
- Worktree: `koda-fidelity-integration-draft`

La combinación se creó únicamente para detectar incompatibilidades antes de la integración de
release. No se usaron `main`, production ni una base de datos compartida.

## Verificaciones ejecutadas

| Comando | Resultado |
|---|---|
| `pnpm install --frozen-lockfile --ignore-scripts` | Correcto |
| `pnpm db:generate` | Correcto |
| `pnpm lint` | Correcto; 20 warnings existentes, 0 errores |
| `pnpm typecheck` | Correcto |
| `pnpm test` | 392 passed, 7 skipped; 54 archivos passed, 2 skipped |
| `pnpm build` | Correcto |

El build informó un warning de trazado NFT de Turbopack en `lib/passes/google.ts` y el warning
esperado de raíz por lockfiles del worktree. No bloquean esta validación, pero deben revisarse
antes de una integración definitiva.

## No ejecutado en esta fase

- Supabase local/Mailpit y migraciones sobre una base desechable.
- Playwright con sesión real para onboarding, recuperación, invitación, tarjetas, QR y
  `/dashboard/my-cards`.
- Validación visual en 375, 768 y 1440 px.

Estos puntos requieren levantar servicios aislados y fixtures; el PR permanece draft hasta
completarlos. Cualquier fallo funcional encontrado allí debe asignarse a FID-0003, FID-0012,
FID-0013, FID-0008 o FID-0018 según corresponda, sin ampliar FID-0019.
