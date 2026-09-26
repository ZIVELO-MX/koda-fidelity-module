# FID-0029: activar un negocio desde soporte

## Preparación

Trabaja con una rama que contenga FID-0028 y el arreglo de `billing:ticket`.
Esta entrega parte y apunta a `benrod/1.2.0`; Raúl decide la fusión.

Los scripts usan `dotenv/config`, que no carga automáticamente `.env.development.local`.
Elige explícitamente el entorno y el operador:

```bash
export DOTENV_CONFIG_PATH=/ruta/al/archivo-del-entorno
export BILLING_OPERATOR=nombre-del-operador
pnpm exec node -r dotenv/config -e 'for (const name of ["DATABASE_URL", "DIRECT_URL"]) { const value = process.env[name]; if (!value) throw new Error(name + " no configurada"); console.log(name, new URL(value).hostname); }'
```

El diagnóstico muestra hosts, nunca contraseñas. Contrasta el entorno con el responsable
de soporte antes de modificar un negocio. Mantén los secretos fuera de Git.

## Operación normal

1. Lee el folio enviado por el negocio:

   ```bash
   pnpm billing:ticket -- show KF-FOLIO
   ```

   Confirma `businessId`, nombre, correo del solicitante, `plan`, `billingInterval` y
   `status`. `show` es de solo lectura y acepta también la forma sin `--`.
   Si ya está `COMPLETED`, no vuelvas a activar esa solicitud.

2. Confirma con el titular condiciones y evidencia del acuerdo de pago manual.
   Precios comprobados al 2026-09-25: Lite $149 MXN/mes o $1,490/año; Pro $299/mes o
   $2,990/año. Revalida su vigencia antes de atender un caso real. La primera activación
   Lite concede un mes calendario de Pro; una renovación o cambio no vuelve a concederlo.

   El CLI no cobra ni emite factura y registra `amountMinor=0`: su éxito acredita
   activación técnica, no recepción de dinero. Conserva la evidencia comercial en el
   procedimiento de soporte. Identifica `BILLING_OPERATOR` antes de activar y cerrar.

3. Copia exactamente `activationCommand` de `show`, incluida la clave del folio:

   ```bash
   pnpm billing:set-plan --business-id ID --plan LITE --interval ANNUAL --idempotency-key ticket:KF-FOLIO
   ```

   Comprueba salida exitosa y `subscriptionId`. No omitas `--interval`, cuyo valor
   predeterminado es mensual, ni reemplaces la clave de idempotencia.

4. Consulta otra vez el folio. Exige `activationRecorded=true` y
   `activationMatchesRequest=true`. `subscription` muestra plan, modalidad, periodo y
   límite del trial; `activationOperator` identifica a quien activó. El folio aún puede
   estar `PENDING`: activación y cierre son dos operaciones distintas.

5. Cierra y vuelve a consultar:

   ```bash
   pnpm billing:ticket -- complete KF-FOLIO
   pnpm billing:ticket -- show KF-FOLIO
   ```

   Exige `COMPLETED`, `completedAt` y `completedBy` en la salida de cierre. Verifica con el
   negocio que pueda usar su tarjeta activa. Repetir `complete` conserva fecha y operador
   originales. No reutilices un folio completado para una renovación.

## Si algo falla a mitad

| Situación | Qué hacer |
| --- | --- |
| Folio inexistente o negocio incorrecto | Comprobar entorno y folio; detenerse antes de activar. |
| Operador ausente, argumentos extra o condiciones distintas | Corregir los datos y consultar otra vez; no forzar el cierre. |
| Se perdió la terminal o respuesta durante la activación | Consultar `show`. Sin auditoría y con condiciones aún confirmadas, repetir el comando con la misma clave. Con auditoría coincidente, reintentar esa misma clave o pasar a `complete`. |
| Activación coincidente y folio `PENDING` | Ejecutar `complete`. No crear otra solicitud ni otra clave. |
| Hay suscripción pero `activationRecorded=false` | Se usó otra clave o proceso. Pedir reconciliación al responsable: repetir con una nueva clave puede cancelar la suscripción, abrir otro periodo y cambiar el trial. |
| Auditoría presente pero condiciones discordantes o ninguna suscripción activa | Detenerse y registrar folio, operador, salida y periodo. La clave consumida no corrige condiciones; hace falta una decisión de soporte y una corrección auditada. |
| `complete` rechaza condiciones o clave | Conservar `PENDING` y contrastar `show`. No editar tablas, borrar auditorías ni cambiar el estado directamente. |
| Se perdió la respuesta de cierre | Consultar y repetir `complete` si hace falta: es idempotente. |

La activación confirma en una transacción suscripción, tarjetas, onboarding y auditoría.
Un error antes del commit revierte esas escrituras; ante una respuesta perdida, consulta
el estado. Estas garantías de reintento son para operación secuencial: no atiendan dos
operadores simultáneamente el mismo folio.

## Entorno del ensayo local

Requiere Docker, dependencias y Prisma generado. Para coexistir con otro Supabase usa
configuración temporal fuera de Git, con `project_id="koda-fidelity-support"`, API 56421,
DB 56432, shadow DB 56430 y SMTP 56434. Copia también la plantilla de recovery referida
por `supabase/config.toml`. Agrega:

```toml
[analytics]
enabled = false
port = 56427
```

Verifica que los puertos estén libres. Con Supabase CLI 2.108.0, `--exclude analytics`
no es un nombre válido; el servicio se llama `logflare`. La configuración anterior fue
la solución comprobada para evitar el puerto analytics del otro proyecto.

```bash
pnpm dlx supabase@2.108.0 start --workdir /ruta/al/proyecto-local-aislado
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:56432/postgres
export DIRECT_URL="$DATABASE_URL"
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

Para reproducir manualmente, crea un negocio de prueba local con usuario admin, tarjeta
DRAFT e inactiva, progreso AWAITING_PAYMENT y solicitud pendiente. Ejecuta los cinco pasos
anteriores; interrumpe el recorrido entre activar y cerrar, consulta y reintenta la misma
clave. Comprueba una suscripción y una auditoría, onboarding/tarjeta ACTIVE, y cierre
COMPLETED sin modificar su fecha al repetirlo. Elimina únicamente ese negocio de prueba.

La automatización está en `lib/__tests__/billing-cli.integration.test.ts` y corre en el job
`verify` del pipeline: usa comandos **pnpm** reales y prueba recorrido, reanudación y
rechazos de operación. Se omite sin `CI=true` o si `DATABASE_URL` no apunta a loopback.
En esta entrega las suites y builds pesados quedan al pipeline por petición del usuario.

```bash
pnpm dlx supabase@2.108.0 stop --workdir /ruta/al/proyecto-local-aislado
```

`stop` conserva los volúmenes y no detiene otros proyectos. No uses `stop --all`, reset,
seed ni `prepare:onboarding-e2e` sobre development compartido. El ensayo del CLI usa datos
reales en PostgreSQL local; la validación de Auth/UI corresponde a sus checks de CI.

## Investigar una referencia de error

El UUID `requestId` de Koda es distinto del Request ID interno de Vercel. Busca el UUID
como texto en Runtime Logs, acotando entorno y fecha del reporte. Ejemplo con acceso al
proyecto y la CLI de Vercel configurada:

```bash
vercel logs --environment preview --no-branch --query "UUID-DE-KODA" --since 1h --expand
```

Usa `production` para incidentes de ese entorno. `--request-id` filtra el identificador
interno de Vercel, no el UUID mostrado por Koda.

Hoy `handleApiError` registra errores inesperados 500 con `requestId` y `errorName`.
Los errores controlados 4xx no pasan por ese registro; recibir un folio no garantiza una
entrada para cada error. Ahí tampoco se registra mensaje, stack ni negocio.
La búsqueda real y la retención de esta cuenta Vercel no han sido comprobadas desde esta
máquina, que no dispone de acceso configurado a sus logs. No se puede prometer recuperación
fuera de la retención. Por decisión del usuario, no se agrega infraestructura de logs ni
se contrata retención en esta fase; la comprobación operativa queda pendiente antes del piloto.

Referencias oficiales: [Vercel CLI logs](https://vercel.com/docs/cli/logs) y
[Runtime Logs y retención](https://vercel.com/docs/logs/runtime).
