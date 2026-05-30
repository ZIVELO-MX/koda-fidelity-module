# Plan: Google OAuth + Protección de Magic Links

## Objetivo

Reemplazar magic link por email como método principal de autenticación de clientes con **Google OAuth**, dejando el magic link como respaldo. Esto elimina la fricción del flujo actual (escribir email → esperar correo → abrir link) y protege el límite de 30 emails/hora de Supabase Free.

## Estrategia

- **Google OAuth** como método principal (1 clic, sin rate limits)
- **Magic link por email** como respaldo para quien no tenga o no quiera usar Google
- Los 30 emails/hora solo se consumen en casos excepcionales

---

## Cambios por archivo

### 1. `app/auth/callback/route.ts` — NUEVO

Ruta que recibe el callback OAuth de Supabase después de que el usuario autoriza Google.

```
GET /auth/callback?code=xxx&provider=google
         ↓
Intercambia código por sesión via createSupabaseReqResClient
         ↓
Redirige al `redirect_to` original (join, my-cards, etc.)
         ↓
Si error → /auth/error?error=...
```

**Implementación:**
```typescript
- Leer code, provider, redirect_to de searchParams
- Crear supabase client con request/response
- Llamar supabase.auth.exchangeCodeForSession(code)
- Si éxito: redirect a redirect_to o /dashboard/my-cards
- Si error: redirect a /auth/error
```

### 2. `lib/auth.ts` — MODIFICAR

Agregar método a la interfaz `AuthService`:

```typescript
signInWithOAuth(provider: string, options?: { redirectTo?: string }): Promise<void>
```

### 3. `lib/auth-service.ts` — MODIFICAR

Implementar `signInWithOAuth`:

```typescript
async signInWithOAuth(provider: string, options?: { redirectTo?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo: options?.redirectTo }
  })
  if (error) throw error
}
```

**Nota:** `signInWithOAuth` redirige al navegador del usuario a Google. En el cliente se usa `createBrowserSupabase()` directamente; en server actions redirige. Ambos casos funcionan porque `signInWithOAuth` hace un redirect browser-side.

### 4. `lib/actions/auth.ts` — MODIFICAR

Agregar:

```typescript
export async function signInWithGoogle(redirectTo?: string): Promise<AuthResult> {
  try {
    const supabase = createBrowserSupabase() // se llama desde cliente
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo ?? `${siteUrl}/auth/callback` }
    })
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error("[signInWithGoogle]", err)
    return { error: "No fue posible iniciar sesión con Google." }
  }
}
```

**Protección de magic links** — agregar cooldown a `sendLoginMagicLink`:

```typescript
// Mapa en memoria: { [email]: timestamp }
const magicLinkCooldowns = new Map<string, number>()
const COOLDOWN_MS = 120_000 // 2 minutos

export async function sendLoginMagicLink(email: string): Promise<AuthResult> {
  const lastSent = magicLinkCooldowns.get(email)
  if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000)
    return { error: `Ya enviamos un enlace recientemente. Revisa tu correo o espera ${remaining} segundos.` }
  }

  try {
    await authService.sendMagicLink(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/my-cards`,
    })
    magicLinkCooldowns.set(email, Date.now())
    return { success: true }
  } catch (err) {
    console.error("[sendLoginMagicLink]", err)
    return { error: getFriendlySendError(err) }
  }
}
```

### 5. `components/auth/google-button.tsx` — NUEVO

Botón "Continuar con Google" que:
- Muestra icono de Google (SVG inline, sin dependencias externas)
- Llama a `signInWithGoogle(redirectTo)` client-side
- Estados: idle → loading ("Conectando con Google…") → redirect (el navegador sale de la página)
- Maneja errores

### 6. `app/join/[cardId]/page.tsx` — MODIFICAR

**Cambios en el join flow:**
- Arriba: botón Google (principal)
- Separador "o"
- Abajo: formulario nombre+email comprimido (solo nombre + email, sin magic link de una vez)
- Se envía magic link inline al submit
- Nota: "¿No tienes Google? Ingresa tu correo"

**Flujo post-Google:**
1. Usuario clic en Google
2. Redirige a Google → autoriza → vuelve a `/auth/callback`
3. Callback redirige a `/join/[cardId]`
4. Join page detecta sesión, fetch `GET /api/join?email=...`
5. Si existe Customer con ese email → muestra tarjeta
6. Si no → muestra formulario nombre + botón "Vincular con esta tarjeta"
7. Se crea Customer via `POST /api/join` (email del perfil Google)

### 7. `app/my-cards/page.tsx` — MODIFICAR

Agregar botón Google arriba del formulario email:
- "Inicia sesión con Google para ver tus tarjetas"
- Formulario email queda abajo como respaldo

### 8. `app/auth/error/page.tsx` — MODIFICAR

Cuando el error es rate limit, mostrar:
- Botón "Continuar con Google" como alternativa inmediata
- El formulario de reenvío queda pero con nota de que puede estar limitado

### 9. `app/page.tsx` — MODIFICAR

Agregar manejo de `code` en searchParams (además de `error`/`error_code`):
- OAuth callbacks de Supabase pueden caer en la landing si el `redirect_to` no está bien configurado
- Redirigir a `/auth/callback` con los params

### 10. `lib/auth-errors.ts` — MODIFICAR

Actualizar `getFriendlySendError` para rate_limit:

```typescript
if (...) {
  return "El límite de enlaces por correo está agotado. Usa Google para acceder al instante."
}
```

---

## Flujo completo — Join con Google

```
Usuario escanea QR
         ↓
   /join/[cardId]
   ┌─────────────────────────┐
   │  [Continuar con Google] │ ← Principal
   │  ─── o ───              │
   │  Nombre: [__________]   │ ← Respaldo
   │  Correo: [__________]   │
   │  [Enviar enlace]        │
   └─────────────────────────┘
         ↓ Google
   Google OAuth popup
         ↓ Autoriza
   /auth/callback?code=xxx
         ↓
   Redirige a /join/[cardId]
         ↓
   ¿Es cliente existente?
   ├── Sí → Muestra tarjeta (step "ready")
   └── No → Muestra formulario nombre
            └── Submit → POST /api/join → tarjeta lista
```

---

## Credenciales necesarias (Google Cloud)

Antes de implementar, necesito que configures:

1. **Google Cloud Console** → [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto o usar existente
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Tipo: **Web application**
5. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://<preview>.vercel.app`
6. Authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://<preview>.vercel.app/auth/callback`
   - `https://<project>.supabase.co/auth/v1/callback`
7. Copiar **Client ID** y **Client Secret**

Luego en **Supabase Dashboard**:
- **Authentication** → **Providers** → **Google**
- Activar y pegar Client ID + Client Secret
- **URL Configuration** → **Site URL**: `https://<preview>.vercel.app`

---

## Roadmap (cambios en `roadmap.md`)

### Actualizar Fase 6 (En progreso)

```
- [ ] Google OAuth — reemplazar magic link como método principal de auth de clientes
- [ ] Botón "Continuar con Google" en join flow, my-cards, página de error
- [ ] Ruta /auth/callback para intercambio de código OAuth
- [ ] Cooldown de magic links por email (2 min entre envíos)
- [ ] Tests: unitarios + e2e para flujo Google
```

### Agregar sección Deuda Técnica

```markdown
### Deuda Técnica — Magic Links por Email

El plan Free de Supabase limita el envío de emails a 30/hora por proyecto.
Esto es insostenible para producción porque:
- Cada cliente que se registra consume un email
- 2 negocios con actividad moderada agotan el límite en minutos
- Todos los usuarios ven error "No fue posible enviar el enlace"
- No hay forma de aumentar este límite sin migrar a Pro ($25/mes)

**Mitigación actual:**
- Google OAuth como método principal (sin rate limits)
- Magic link queda como respaldo para quien no use Google
- Cooldown de 2 min entre envíos por email
- Mensajes de error claros cuando se alcanza el límite

**Solución definitiva (Post-MVP):**
- Migrar a Supabase Pro ($25/mes) o
- Configurar SMTP custom (SendGrid, Resend) para enviar emails
  desde nuestro propio dominio sin pasar por los rate limits de Supabase
```

---

## Tests

### Unitarios (Vitest)

| Archivo | Tests |
|---------|-------|
| `lib/__tests__/auth-errors.test.ts` | Agregar test para nuevo mensaje de rate limit |
| `lib/__tests__/auth.test.ts` | Agregar test para `signInWithOAuth` |

### E2E (Playwright)

| Archivo | Tests |
|---------|-------|
| `e2e/auth-errors.spec.ts` | Test que error rate limit muestra sugerencia Google |
| `e2e/auth-flow.spec.ts` | Test de flujo con Google (requiere configurar test user) |

---

## Orden de implementación

1. `lib/auth.ts` — interfaz
2. `lib/auth-service.ts` — implementación server
3. `lib/actions/auth.ts` — server action + cooldown
4. `app/auth/callback/route.ts` — callback handler
5. `components/auth/google-button.tsx` — botón UI
6. `app/join/[cardId]/page.tsx` — integrar Google
7. `app/my-cards/page.tsx` — integrar Google
8. `app/auth/error/page.tsx` — Google en rate limit
9. `lib/auth-errors.ts` — mensajes actualizados
10. `roadmap.md` — documentación
11. Tests
