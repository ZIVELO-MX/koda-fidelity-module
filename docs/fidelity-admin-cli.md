# CLI administrativa de Fidelity

`pnpm fidelity:admin` consulta una cuenta desde la terminal. `pnpm fidelity:admin -- set-plan`
consulta la misma cuenta, muestra el tiempo transcurrido en su plan actual y permite
cambiarlo mediante `POST /api/subscription` después de revisar los datos.
Selecciona `DESARROLLO` o `PRODUCCION` y después ingresa el correo de un admin.
Por ahora, el cambio de plan se ha configurado y probado solo en Desarrollo.

## Configuración

Desde la raíz del repositorio, configura `DATABASE_URL` en el archivo del entorno:

- Desarrollo: `.env.development.local`
- Producción: `.env.production.local`

Para cambiar un plan en Desarrollo, el archivo también necesita
`BILLING_INTERNAL_SECRET`, `NEXT_PUBLIC_BASE_URL=http://localhost:3000` y,
opcionalmente, `BILLING_OPERATOR`. Arranca la API local con `pnpm dev` desde el
mismo repositorio y archivo de entorno antes de ejecutar la CLI. La API y la CLI
deben compartir el mismo secreto. Si la conexión directa de Supabase requiere IPv6,
usa el pooler IPv4 para `DATABASE_URL`.

El secreto puede ser un valor aleatorio generado para este entorno local, por ejemplo
con `openssl rand -hex 32`. Guárdalo solo en `.env.development.local`; nunca lo
añadas al repositorio.

Los archivos locales de entorno están excluidos de Git. La CLI carga solo el archivo
del entorno elegido, valida la URL de PostgreSQL y muestra el nombre del entorno y el
host antes de consultar. No imprime la URL completa, usuarios ni contraseñas. Al usar
Supabase desde una red sin IPv6, configura `DATABASE_URL` con el transaction pooler IPv4.

La CLI limita su cliente Prisma a una conexión y consulta de forma secuencial. El límite
se aplica en memoria al proceso; no cambia el archivo de entorno.
Para este MVP se reutiliza `DATABASE_URL`, que puede tener permisos más amplios; la CLI
usa Prisma para consultar y la API interna para cambiar el plan. Está destinada a
operadores de soporte confiables.

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
periodicidad antes de pedir que escribas `CAMBIAR`; conserva la periodicidad actual,
envía una clave de idempotencia y vuelve a consultar la base para verificar el cambio.
Si el usuario o negocio no existe, no intenta modificar datos. La activación manual
no ejecuta un cobro.

## Ejecución

```bash
pnpm fidelity:admin
pnpm fidelity:admin -- set-plan
```

Ejemplo de consulta (el estado mostrado depende de los datos actuales):

```text
$ pnpm fidelity:admin
Entorno (DESARROLLO|PRODUCCION): DESARROLLO
Correo del admin: test@zivelo.dev
Acceso efectivo: PRO · suscripción ACTIVE (PRO/MONTHLY)
Plan PRO desde 6 oct 2026 · 0 días transcurridos
```

Ejemplo de cambio para una cuenta que todavía tiene Lite:

```text
$ pnpm fidelity:admin -- set-plan
Entorno (DESARROLLO|PRODUCCION): DESARROLLO
Correo del admin: admin@ejemplo.dev
Acceso efectivo: LITE · suscripción ACTIVE (LITE/MONTHLY)
Plan LITE desde 1 sep 2026 · 35 días transcurridos
Nuevo plan (LITE|PRO): PRO
Cambio: Mi negocio (biz-123) · LITE → PRO · MONTHLY
Escribe CAMBIAR para aplicar: CAMBIAR
Plan confirmado: Mi negocio · PRO/MONTHLY
```

Si falla la conexión, comprueba que seleccionaste el entorno correcto, que su archivo
contiene `DATABASE_URL` y que el host permite conexiones desde tu red. Los errores no
incluyen el valor de la URL.
