# FID-0021 — reporte de integración preliminar

## SHA y alcance

- Backend: `benrod/1.2.0` (`027f208`, incluyendo PR #123).
- Diseño: `rulaxx/1.2.0` (`8f639878a6e86b52f454aadb4b3605f2f896f869`).
- Resultado integrado: PR draft #122 (`integration/fid-0014-design-draft`), siempre contra
  `benrod/1.2.0`; no se usa `main` ni una base compartida.

## Conflictos resueltos

Se conservaron ambos lados por responsabilidad: sesión/cookies y contratos de backend del
lado `benrod`; estructura visual, estados y accesibilidad del lado `rulaxx`. Los archivos
resueltos fueron `lib/supabase-server.ts`, `app/dashboard/(main)/page.tsx`,
`app/dashboard/(main)/team/team-client.tsx`, `components/dashboard/customer-actions-menu.tsx`,
`app/auth/error/page.tsx` y `e2e/auth-errors.spec.ts`. La identidad sigue enlazada por
`authUserId`; no se aceptó una rama completa como resolución.

## Verificación reproducible

En PR #122, SHA `e8547ae`, CI terminó `success` en `verify`, `browser-smoke`,
`auth-e2e (Supabase local + Mailpit)` y Vercel. El reporte del PR registra `pnpm lint`,
`pnpm typecheck`, `pnpm test` (392 passed, 7 skipped) y `pnpm build`.

Esto es evidencia de compilación y recorridos automatizados del draft, no autorización de
merge. Falta todavía ejecutar recorridos específicos de sellado/canje, búsqueda paginada,
invitación/aceptación, aislamiento entre dos negocios y Wallet deshabilitado con aserciones
de contrato.

La rama backend ahora añade `lib/__tests__/fid0021-contracts.integration.test.ts`: en el
PostgreSQL aislado comprueba sellado, canje, reintento idempotente y aislamiento de clientes.
La suite de parser comprueba paginación y rechaza errores/formas inválidas; la suite de
Wallet comprueba `501` y `x-request-id`. La búsqueda HTTP y la aceptación/eliminación de
invitaciones todavía requieren recorridos de API con sesión en el draft integrado.
