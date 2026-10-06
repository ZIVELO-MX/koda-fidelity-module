# CLI de consulta administrativa de Fidelity

`pnpm fidelity:admin` inicia una consulta interactiva de solo lectura para soporte.
Selecciona `DESARROLLO` o `PRODUCCION` y después ingresa el correo de un admin.

## Configuración

Desde la raíz del repositorio, configura `DATABASE_URL` en el archivo del entorno:

- Desarrollo: `.env.development.local`
- Producción: `.env.production.local`

Los archivos locales de entorno están excluidos de Git. La CLI carga solo el archivo
del entorno elegido, valida la URL de PostgreSQL y muestra el nombre del entorno y el
host antes de consultar. No imprime la URL completa, usuarios ni contraseñas. Al usar
Supabase desde una red sin IPv6, configura `DATABASE_URL` con el transaction pooler IPv4.

La CLI limita su cliente Prisma a una conexión y consulta de forma secuencial. El límite
se aplica en memoria al proceso; no cambia el archivo de entorno.
Para este MVP se reutiliza `DATABASE_URL`, que puede tener permisos más amplios; la CLI
solo expone consultas de lectura y está destinada a operadores de soporte confiables.

## Información consultada

- Un admin sin negocio vinculado: nombre, correo y paso/estado de onboarding.
- Un admin con negocio: negocio, miembros, invitaciones pendientes, suscripción más
  reciente, acceso efectivo, conteos de tarjetas por estado y solicitudes de activación
  pendientes.
- Un correo que pertenece a un usuario `sellador` se identifica como no admin.

No muestra clientes, progreso de sellos ni datos de borradores de onboarding. No crea,
actualiza ni elimina registros. Si el usuario o negocio no existe, muestra el resultado
sin intentar modificar datos.

## Ejecución

```bash
pnpm fidelity:admin
```

Si falla la conexión, comprueba que seleccionaste el entorno correcto, que su archivo
contiene `DATABASE_URL` y que el host permite conexiones desde tu red. Los errores no
incluyen el valor de la URL.
