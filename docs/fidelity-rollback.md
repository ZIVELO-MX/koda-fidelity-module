# Fidelity: backup y rollback

Este procedimiento aplica a un entorno identificado explícitamente. No se debe usar una
`DATABASE_URL` de producción durante la validación de dev.

## Backup

Usa la conexión directa (`DIRECT_URL`) y el formato custom de PostgreSQL:

```bash
set -a; source .env.development.local; set +a
umask 077
pg_dump "$DIRECT_URL" --format=custom --no-owner --file="/secure/path/fidelity-dev-YYYYMMDD.dump"
pg_restore --list "/secure/path/fidelity-dev-YYYYMMDD.dump" >/dev/null
```

Conserva el archivo fuera del repositorio, con permisos de propietario únicamente, y
registra el tamaño, fecha, entorno y resultado de `pg_restore --list`.

## Rollback controlado

1. Detén el despliegue que escribe en la base y conserva sus logs/request IDs.
2. Identifica la base de destino y genera un backup de su estado actual.
3. En una base Supabase de restauración, verifica el dump con `pg_restore --list`.
4. Restaura usando la herramienta Supabase/PostgreSQL aprobada por operaciones, respetando
   los esquemas administrados (`auth`, `storage` y `realtime`) y sus extensiones.
5. Ejecuta `prisma migrate status`, el diff contra `prisma/schema.prisma`, smoke tests de
   sellos/completion/redeem y las pruebas de autenticación antes de reabrir tráfico.
6. Registra el resultado y conserva el backup anterior para una recuperación adicional.

La restauración parcial del esquema `public` en un contenedor compatible solo demuestra la
integridad del dump de aplicación; no sustituye una restauración integral de Supabase.

## Promoción

La promoción sigue el flujo `dev` → validación → `main`. Solo se realiza después de que CI
esté verde, los checks operativos estén documentados y el responsable del release autorice
la operación. Este documento no autoriza merge, despliegue ni restauración en producción.
