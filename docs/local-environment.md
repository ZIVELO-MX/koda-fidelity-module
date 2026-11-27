# Entorno local de Koda Fidelity

Usa Node.js 22, pnpm 11, la CLI de Supabase y Docker en ejecución. La primera
instalación descarga dependencias e imágenes públicas. Los flujos de la app
usan PostgreSQL, Auth y Storage locales. Si usas Colima u otra VM para
Docker, trabaja en un directorio compartido con la VM para que Supabase
pueda montar la plantilla de recuperación.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm local:dev
```

Abre http://localhost:3000. El comando arranca Supabase, obtiene las claves de
la instancia local, aplica las migraciones de Prisma y prepara un negocio,
una tarjeta de dos sellos y un operador de ejemplo. Pasa las variables a la
app en el entorno del proceso. Las claves y URLs remotas que ya tengas en
archivos locales no reemplazan las conexiones de Supabase y Prisma del comando.

- Operador de ejemplo: `operator.local@dev.invalid` / `KodaLocal123!`.
- Alta de cliente: http://localhost:3000/join/card-local-fidelity.
- Bandeja de correo de Supabase Auth: http://127.0.0.1:55434.

`pnpm local:setup` prepara el entorno sin arrancar Next.js. La preparación es
repetible y conserva las inscripciones y los movimientos existentes. Detén
Next.js con Ctrl+C y ejecuta `supabase stop` para detener los contenedores
conservando los datos locales. Para reconstruir el proyecto local desde cero,
usa `supabase stop --no-backup` antes de `pnpm local:setup`. La opción
`--no-backup` elimina los datos del proyecto local.

## Pruebas

```sh
pnpm exec playwright install chromium
pnpm local:test
```

Detén el servidor de desarrollo si está usando el puerto 3000. El comando
prepara Supabase, compila la app y ejecuta las pruebas de Playwright con una
instancia de Next.js en modo producción. Crea clientes distintos para que
puedas repetirlo con la misma base. Las pruebas cubren alta, sesiones
separadas de cliente y operador, sellado idempotente, canje, avatares privados y recuperación de correo en Mailpit.

## Integraciones

| Integración | En local | Para validar el proveedor |
| --- | --- | --- |
| PostgreSQL, Auth por correo y Storage | Supabase en Docker | Credenciales del proyecto de destino al desplegar |
| Correo de Supabase Auth | Mailpit captura los mensajes | Configuración de entrega real de correo |
| SMTP de la aplicación | El envío SMTP directo queda desactivado. Las operaciones de Auth que entregan por Mailpit siguen disponibles. | Credenciales SMTP para el reenvío de invitaciones a cuentas existentes |
| OAuth de Google | Usar el alta y la sesión por correo | Cliente OAuth y redirecciones registradas |
| Apple y Google Wallet | Emisión desactivada con la configuración local | Certificado o credenciales del emisor y validación con cada proveedor |
