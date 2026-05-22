# Portabilidad de Auth

## Problema

Usamos Supabase Auth, pero queremos poder migrar a otro proveedor (NextAuth, Clerk, Auth0, etc.) sin reescribir toda la app.

## Solución

Capa de abstracción con una interfaz común.

---

## Interfaces

### `lib/auth.ts`

Define el contrato que cualquier proveedor debe implementar:

```ts
interface AuthService {
  getSession(): Promise<AuthSession | null>
  signIn(email: string, password: string): Promise<AuthSession>
  signUp(email: string, password: string, name: string): Promise<AuthSession>
  signOut(): Promise<void>
  getUser(): Promise<AuthUser | null>
}
```

Las apps que necesiten auth importan `authService` desde este módulo (o desde un barrel export), nunca directamente desde Supabase.

---

## Implementaciones

| Archivo | Proveedor |
|---|---|
| `lib/auth-service.ts` | Supabase Auth |
| `lib/auth-provider-nextauth.ts` | NextAuth (futuro) |
| `lib/auth-provider-clerk.ts` | Clerk (futuro) |

Cada implementación cumple `AuthService`.

---

## ¿Cómo se migra?

1. Creas `lib/auth-provider-xyz.ts` implementando `AuthService`
2. Cambias el import de `authService` en los componentes de app (o en el barrel export)
3. Todo lo demás sigue igual

Los componentes nunca dependen directamente de Supabase Auth, solo de la interfaz.

---

## ¿Qué NO abstrae?

- `proxy.ts` (middleware) usa `createServerClient` de Supabase directamente porque necesita cookies del request/response. Si migras de proveedor, reescribes ese archivo.
- Clientes de Supabase para storage/DB si los usas fuera de Prisma.

---

## Archivos

| Archivo | Rol |
|---|---|
| `lib/auth.ts` | Interfaz `AuthService` |
| `lib/auth-service.ts` | Implementación con Supabase |
| `lib/supabase.ts` | Cliente browser |
| `lib/supabase-server.ts` | Cliente server (cookies) |
| `proxy.ts` | Protege rutas del dashboard |
