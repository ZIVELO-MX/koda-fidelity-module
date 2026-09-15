# Entorno de desarrollo

Esta aplicación usa Supabase PostgreSQL mediante Prisma y Supabase Auth.

## Desarrollo local

1. Copia la plantilla de variables:

   ```bash
   cp .env.example .env.development.local
   ```

2. Completa `.env.development.local` con las credenciales del proyecto de Supabase de desarrollo.

   Como mínimo necesitas:

   ```env
   DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://...:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://PROJECT_REF.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
   SUPABASE_SERVICE_ROLE_KEY="..."
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   AUTH_SECURITY_SECRET="..."
   ```

   `DATABASE_URL` usa la conexión pooled para la aplicación y `DIRECT_URL` la conexión de migraciones. Copia ambas desde Supabase → Database → Connect.

3. Instala dependencias y aplica el esquema:

   ```bash
   pnpm install
   pnpm db:generate
   pnpm db:migrate
   ```

4. Inicia la aplicación:

   ```bash
   pnpm dev
   ```

Next.js carga `.env.development.local` automáticamente. Los comandos `pnpm db:*` también lo cargan mediante `scripts/prisma-dev.mjs`.

No ejecutes `pnpm db:seed` contra una base compartida sin revisar antes `prisma/seed.ts`: el seed elimina datos de negocio existentes.

## Vercel Preview

Vercel Preview no lee `.env.development.local` del equipo local. Configura las variables en:

`Vercel → Project → Settings → Environment Variables`

Agrega las mismas variables de Supabase dev con scope **Preview**. La variable `NEXT_PUBLIC_BASE_URL` debe apuntar a la URL de Preview correspondiente, o a la URL estable de Preview si el proyecto la tiene configurada.

No subas `.env.development.local` al repositorio. Los secretos de Preview deben vivir en Vercel.

El build de Vercel solo genera Prisma Client; las migraciones deben ejecutarse como un paso controlado de despliegue, usando las variables de Preview o del entorno que corresponda.

## Producción

Production debe tener sus propias variables en Vercel con scope **Production**. El wrapper de Prisma no carga `.env.development.local` cuando `NODE_ENV=production`; en ese caso usa las variables inyectadas por el entorno.

No compartas `SUPABASE_SERVICE_ROLE_KEY` ni ninguna contraseña entre cliente y navegador. Las variables con prefijo `NEXT_PUBLIC_` sí se exponen al navegador.
