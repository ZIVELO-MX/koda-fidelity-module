# Entrega a FID-0014

## Configuración verificada

- `FID_DEBUG_AUTH` solo habilita cuentas `@invalid.dev` fuera de producción; `VERCEL_ENV=production`
  y `NODE_ENV=production` rechazan la excepción.
- El correo de invitaciones y recuperación se prueba con Supabase local y Mailpit en CI;
  los redirects pasan por `/auth/confirm` y conservan el destino validado.
- Wallet queda opt-in mediante `FID_WALLET_ENABLED`; sin la bandera, Apple y Google responden
  `501` y no generan pases.
- Las rutas de negocio filtran por `businessId` derivado de sesión; las pruebas de clientes,
  usuarios y operaciones comprueban aislamiento entre dos negocios.

## Pendientes para FID-0014

- Ejecutar el despliegue/promoción únicamente después del merge manual de PR #124 y la
  revisión del PR draft #125.
- Configurar secretos reales de SMTP, Supabase, certificados Wallet y redirects de Vercel
  en el entorno de destino; no se incluyen en el repositorio.
- Confirmar precios, testimonios y decisión comercial de Wallet en la landing antes de
  publicar. El flujo Wallet real sigue fuera de este ciclo.

La evidencia reproducible está en `docs/fid-0021-integration-report.md` y en los checks de
CI de los PR #122 y #125. Esta entrega no autoriza release por sí misma.
