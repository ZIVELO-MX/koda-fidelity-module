# CLI administrativa de Fidelity

`pnpm fidelity:admin` consulta una cuenta desde la terminal. `pnpm fidelity:admin -- set-plan`
consulta la misma cuenta, muestra el tiempo transcurrido en su plan actual y permite
cambiarlo mediante `POST /api/subscription` después de revisar los datos.
`pnpm fidelity:admin -- notify-plan-change` emite un aviso pendiente para un cambio
anterior que carece de transición en su auditoría mediante `POST /api/subscription/plan-change-notice`.
La CLI solo admite `DESARROLLO`. Rechaza `PRODUCCION` antes de cargar `.env.production.local`
o consultar datos; la consulta, `set-plan` y `notify-plan-change` quedan limitados a Dev.

## Configuración

Desde la raíz del repositorio, configura `DATABASE_URL` en el archivo del entorno:

- Desarrollo: `.env.development.local`

Para cambiar un plan o emitir un aviso en Desarrollo, el archivo también necesita
`BILLING_INTERNAL_SECRET`, `NEXT_PUBLIC_BASE_URL=http://localhost:3000` y,
opcionalmente, `BILLING_OPERATOR`. Arranca la API local con `pnpm dev` desde el
mismo repositorio y archivo de entorno antes de ejecutar la CLI. La API y la CLI
deben compartir el mismo secreto. Si la conexión directa de Supabase requiere IPv6,
usa el pooler IPv4 para `DATABASE_URL`.

El secreto puede ser un valor aleatorio generado para este entorno local, por ejemplo
con `openssl rand -hex 32`. Guárdalo solo en `.env.development.local`; nunca lo
añadas al repositorio.

Los archivos locales de entorno están excluidos de Git. La CLI carga el archivo
de Desarrollo, valida la URL de PostgreSQL y muestra el nombre del entorno y el
host antes de consultar. No imprime la URL completa, usuarios ni contraseñas. Al usar
Supabase desde una red sin IPv6, configura `DATABASE_URL` con el transaction pooler IPv4.

La CLI limita su cliente Prisma a una conexión y consulta de forma secuencial. El límite
se aplica en memoria al proceso; no cambia el archivo de entorno.
Para este MVP se reutiliza `DATABASE_URL`, que puede tener permisos más amplios; la CLI
usa Prisma para consultar y la API interna para cambiar el plan. Está destinada a
operadores de soporte confiables.

Un cambio efectivo Lite ↔ Pro registra `previousPlan` y `effectivePlan` en el mismo
`BillingAuditEvent` que crea la suscripción, dentro de una transacción. Ese evento
alimenta el aviso que ven los miembros del negocio en el panel; cada miembro puede
confirmarlo por separado. La CLI no crea un segundo evento al cambiar el plan.

## Información consultada

- Un admin sin negocio vinculado: nombre, correo y paso/estado de onboarding.
- Un admin con negocio: negocio, miembros, invitaciones pendientes, suscripción más
  reciente, acceso efectivo, días completos transcurridos en el plan actual, conteos
  de tarjetas por estado y solicitudes de activación pendientes. Las renovaciones
  consecutivas del mismo plan se cuentan desde la primera activación de esa racha;
  un día significa 24 horas completas transcurridas.
- Un correo que pertenece a un usuario `sellador` se identifica como no admin.

No muestra clientes, progreso de sellos ni datos de borradores de onboarding. La
consulta sola no modifica datos. `set-plan` muestra el negocio, el plan y la
periodicidad antes de pedir que escribas `CAMBIAR`; conserva la periodicidad y las fechas
del periodo actual, envía una clave de idempotencia y vuelve a consultar la base para
verificar el cambio.
Si el usuario o negocio no existe, no intenta modificar datos. La activación manual
no ejecuta un cobro.

`notify-plan-change` solo ofrece la última transición hacia el plan efectivo actual si
el evento original no la registra, incluso si después hubo renovaciones del mismo plan.
Muestra el plan efectivo actual y la dirección del
cambio, solicita un resumen y el nombre o correo de quien emite el aviso, y exige
escribir `AVISAR`. La API vuelve a validar el negocio, la auditoría y el plan efectivo
antes de crear un nuevo `BillingAuditEvent` con referencia al original. No cambia la
suscripción ni modifica el evento anterior. Rechaza un destino distinto del plan
efectivo y un segundo aviso para el mismo evento.

## Ejecución

```bash
pnpm fidelity:admin
pnpm fidelity:admin -- set-plan
pnpm fidelity:admin -- notify-plan-change
```

Ejemplo de consulta (el estado mostrado depende de los datos actuales):

```text
$ pnpm fidelity:admin
Entorno (DESARROLLO): DESARROLLO
Correo del admin: admin@ejemplo.dev
Acceso efectivo: PRO · suscripción ACTIVE (PRO/MONTHLY)
Plan PRO desde 6 oct 2026 · 0 días transcurridos
```

Ejemplo de cambio para una cuenta que todavía tiene Lite:

```text
$ pnpm fidelity:admin -- set-plan
Entorno (DESARROLLO): DESARROLLO
Correo del admin: admin@ejemplo.dev
Acceso efectivo: LITE · suscripción ACTIVE (LITE/MONTHLY)
Plan LITE desde 1 sep 2026 · 35 días transcurridos
Nuevo plan (LITE|PRO): PRO
Cambio: Mi negocio (biz-123) · LITE → PRO · MONTHLY
Escribe CAMBIAR para aplicar: CAMBIAR
Plan confirmado: Mi negocio · PRO/MONTHLY
```

Ejemplo de recuperación de un aviso faltante después de un cambio ya aplicado:

```text
$ pnpm fidelity:admin -- notify-plan-change
Entorno (DESARROLLO): DESARROLLO
Correo del admin: admin@ejemplo.dev
Acceso efectivo: LITE · suscripción ACTIVE (LITE/MONTHLY)
Resumen del aviso: Cambio aplicado por soporte
Nombre o correo de quien emite el aviso: raul@zivelo.dev
Aviso: Mi negocio (biz-123) · PRO → LITE · auditoría audit-123
Escribe AVISAR para registrar el aviso: AVISAR
Aviso registrado: notice-123 · PRO → LITE
```

Si falla la conexión, comprueba que seleccionaste el entorno correcto, que su archivo
contiene `DATABASE_URL` y que el host permite conexiones desde tu red. Los errores no
incluyen el valor de la URL.
