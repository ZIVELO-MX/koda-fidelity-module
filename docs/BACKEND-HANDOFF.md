# Handoff a backend para el rediseño de Koda Fidelity

Verificado contra `dev` @ `29de56e` el 2026-09-01. Todas las rutas son relativas a este
repositorio. Nada de este documento está implementado: es la lista de trabajo de backend
que el rediseño de interfaz no va a tocar.

## Reparto de trabajo

**Frontend / diseño (este equipo).** Visual y experiencia: `app/**/page.tsx`, `app/**/layout.tsx`,
`components/**`, `app/globals.css`, tokens, tipografía, estados vacíos, movimiento,
accesibilidad y navegación. Adoptamos el ADN de KODA (Switzer, `#FF6B35`, grises cálidos,
radios, sombras, densidad).

**Backend (tú).** Todo lo funcional: `app/api/**`, `lib/actions/**`, `lib/api-utils.ts`,
`lib/auth-service.ts`, `lib/supabase-*.ts`, `lib/passes/**`, `prisma/**`, sesión, roles,
correo, Wallet y despliegue.

Para poder revisar el rediseño de punta a punta sin Supabase, frontend añade un **modo demo
de solo lectura** (`DEMO_MODE=1`) que vive en archivos nuevos y se apaga por defecto: no
cambia contratos, ni esquema, ni handlers. Si te topas con él en producción, es un bug nuestro.

---

## 1. Bloqueantes del rediseño

Cosas que hacen que la interfaz nueva no se pueda terminar o no se pueda mostrar completa.

### B1 · El negocio se resuelve por correo, y deja fuera a los colaboradores

Siete lugares buscan el negocio con `prisma.business.findUnique({ where: { email: user.email } })`,
es decir contra `Business.email`. Eso solo coincide con la cuenta fundadora: un colaborador
invitado (`sellador`, o un `admin` agregado desde Equipo) tiene su propio correo, la consulta
devuelve `null` y la página lo rebota a `/login`, con sesión válida.

- `app/dashboard/(main)/cards/page.tsx:33`
- `app/dashboard/(main)/cards/[id]/page.tsx:32`
- `app/dashboard/(main)/cards/archived/page.tsx:17`
- `app/dashboard/(main)/customers/page.tsx:25`
- `app/dashboard/(main)/qr-codes/[cardId]/page.tsx:17`
- `app/dashboard/(main)/qr-codes/[cardId]/preview/page.tsx:17`
- `app/auth/callback/route.ts:20`, que además decide a dónde entra el usuario tras el login

El patrón correcto ya existe y está probado: `getBusinessFromSession()` en `lib/api-utils.ts:59`
resuelve `User` por correo y de ahí toma `business`. `app/dashboard/(main)/layout.tsx:19` y
`app/dashboard/(main)/page.tsx:38` también lo hacen bien vía `User.businessId`. Unificar en una
sola función y usarla en las siete.

**Impacto en diseño:** la navegación por rol (qué ve un sellador contra un admin) no se puede
diseñar mientras el sellador no pueda entrar a ninguna de esas pantallas.

### B2 · Las métricas del panel están mal calculadas y el endpoint bueno no se usa

En `app/dashboard/(main)/page.tsx:100`, "Canjes" sale de `allLogs.filter(l => l.type === "redeem")`
sobre los **últimos diez** eventos (`take: 10`, línea 68): un negocio con actividad ve como
mucho 10 canjes históricos. "Sellos Entregados" (línea 99) suma `customer.stamps`, que es el
**saldo actual**, no lo entregado: cada canje resetea a cero y la cifra baja.

`app/api/dashboard/stats/route.ts` ya calcula bien los canjes (`stampLog.count` con
`type: "redeem"`) y **nadie lo consume**: solo aparece en `lib/__tests__/openapi.test.ts`.

Además el panel rediseñado necesita datos que hoy no existen:

- serie diaria de sellos y canjes de los últimos 30 días
- clientes nuevos por semana
- tasa de canje (canjes / tarjetas completadas)
- tarjetas ordenadas por actividad reciente, no solo por `createdAt`

**Impacto en diseño:** el panel nuevo es de métricas. Sin agregados reales no hay gráfica que
dibujar, y hoy no puedo mostrar un número que sé que es falso.

### B3 · `/auth/error` renderiza una página en blanco

`app/auth/error/page.tsx:14` devuelve un `<Suspense>` con `fallback` y **cuerpo vacío**.
`AuthErrorContent` (línea 25) está completo y maneja `otp_expired`, `rate_limit`, reenvío de
magic link y alternativa con Google, pero nunca se monta. Cualquier error de OAuth u OTP
termina en una pantalla vacía. Basta con renderizar `<AuthErrorContent />` dentro del `Suspense`.

**Impacto en diseño:** es la pantalla de rescate del flujo de acceso; no puedo rediseñar lo que
no se renderiza.

### B4 · No hay recuperación de contraseña dentro del producto

`components/auth/login-form.tsx` manda "¿Olvidaste tu contraseña?" a un enlace de WhatsApp con
número hardcodeado (`SUPPORT_WA = "5213921107274"`, línea 15) y texto prellenado. Mientras tanto
`sendPasswordReset()` existe completo en `lib/actions/auth.ts:156` y **nadie lo llama**; ya
apunta a `/auth/callback?next=/dashboard/update-password`.

**Impacto en diseño:** el rediseño contempla recuperación self-service. Necesito el server action
conectado para poder diseñar el estado "te enviamos el enlace".

### B5 · Un registro que exige confirmación por correo se queda sin negocio

En `lib/actions/auth.ts:104`, si `authService.signUp` lanza `"Confirmation email sent"` la acción
devuelve `{ success: true }` y **sale antes** de crear `Business` y `User` en Prisma (línea 113).
Cuando la persona confirma su correo y entra, el layout no encuentra `User` y la manda a
`/dashboard/forbidden` (`app/dashboard/(main)/layout.tsx:25`). Queda una cuenta en Supabase sin
negocio, sin ruta de recuperación.

**Impacto en diseño:** `/dashboard/forbidden` termina siendo el destino de usuarios legítimos.
No se puede diseñar como lo que debería ser: una salida rara.

### B6 · Wallet: decidir si existe o no

La interfaz promete Wallet en cinco lugares y lo apaga con "Próximamente"
(`app/join/[cardId]/page.tsx:301,314` y `app/dashboard/my-cards/page.tsx:501,504,507`), mientras
`/api/passes/apple/[cardId]` y `/api/passes/google/[cardId]` existen y no están detrás de ningún
gate. `lib/passes/apple.ts:7` y `lib/passes/google.ts:7` dependen de `*_WALLET_DEV_MODE` y de
credenciales que no están en el entorno.

Necesito una decisión binaria para el rediseño: **entra en este ciclo** (y diseño el flujo real)
o **se retira de la interfaz** (y quito la promesa). "Próximamente" en cinco botones no es una
opción de diseño.

---

## 2. Seguridad y consistencia de datos

No bloquean el rediseño, pero son deuda conocida y algunas tocan pantallas que voy a rehacer.

### S1 · Contraseña temporal compartida, y devuelta en la respuesta

`app/api/users/route.ts:6` define `const DEFAULT_PASSWORD = "Koda1234!"` para **todo** usuario
invitado, y la respuesta del `POST` la devuelve en claro (`temporaryPassword`, línea 92). El
propio proyecto ya reconoce esta deuda. Sustituir por contraseña aleatoria por usuario, o mejor,
por invitación con enlace de un solo uso.

### S2 · `checkBusinessEmail` permite enumerar correos

`lib/actions/auth.ts:17` es un server action sin autenticar que responde si un correo existe
como usuario y además devuelve el **apodo del negocio**. Cualquiera puede sondear correos desde
el navegador. La UI lo usa para decidir entre contraseña y magic link
(`components/auth/login-form.tsx:61`); si se conserva, conviene respuesta uniforme y límite de
tasa.

### S3 · `POST /api/join` inscribe cualquier correo sin verificarlo

`app/api/join/route.ts:211` crea el `Customer` con el correo que venga en el cuerpo, sin sesión y
sin verificación de propiedad. Se puede inscribir a terceros y llenar de basura una tarjeta.
El `GET` sí valida (`?id=` exige sesión de negocio, `?email=` exige que el correo sea el de la
sesión, línea 255).

### S4 · `/invite` confía en los query params

`app/invite/page.tsx:24` toma `email`, `business` y `name` de la URL sin validar nada y los
usa en el `<title>`, en Open Graph (`generateMetadata`, línea 9) y para prellenar el login.
Cualquiera puede fabricar una invitación creíble a nombre de un negocio real. Validar contra una
invitación existente, o firmar el enlace.

### S5 · El cooldown del magic link vive en memoria del proceso

`lib/actions/auth.ts:12` guarda `magicLinkCooldowns` en un `Map` de módulo. En Vercel cada
instancia tiene el suyo y se pierde en cada arranque en frío: el límite de 120 s no se cumple.
Mover a la base o apoyarse en el límite de Supabase.

### S6 · El panel se traga sus propios redirects

`app/dashboard/(main)/page.tsx` envuelve la carga en `try { … } catch { loadingError = true }`,
y adentro llama `redirect()` (líneas 35, 44 y 53). En Next, `redirect()` funciona lanzando
`NEXT_REDIRECT`: el `catch` lo captura y en vez de redirigir pinta "Error al cargar el panel".
Sacar los `redirect()` fuera del `try`, o re-lanzar el error de redirección.

---

## 3. Contratos que el rediseño va a pedir

Lista para dimensionar; la acordamos antes de que la implementes.

| # | Qué necesito | Hoy |
|---|---|---|
| C1 | `GET /api/dashboard/stats` extendido: series diarias de 30 días (sellos, canjes), clientes nuevos por semana, tasa de canje, top de tarjetas por actividad | Existe con agregados básicos y sin consumidores |
| C2 | Actividad reciente paginada por cursor | `take: 10` fijo en el panel |
| C3 | Clientes con búsqueda, orden y paginación en servidor | `app/dashboard/(main)/cards/[id]/page.tsx:67` filtra y ordena **en memoria** tras traer todos los clientes activos |
| C4 | Errores tipados y distinguibles (sin sesión, sin negocio, sin permiso) para pintar estados distintos | Todo cae en un `redirect("/login")` genérico |
| C5 | Rol disponible en la sesión del layout | Ya existe (`app/dashboard/(main)/layout.tsx:28`); solo mantenerlo |

### Perfil de la persona y borrado de cuenta

Trabajo nuevo, pedido por producto: el perfil pasa a tener foto y color de marco, y desde
Configuración se debe poder borrar la cuenta. Nada de esto tiene hoy dónde vivir.

| # | Qué necesito | Estado actual |
|---|---|---|
| C6 | `avatarUrl` y `avatarRingColor` en `User` | No existe ningún campo de imagen en el esquema. El avatar de hoy son iniciales sobre `--ink` |
| C7 | Subida y borrado de la imagen de perfil | `lib/supabase-storage.ts` ya resuelve esto para el logo del negocio. Conviene reutilizarlo: cuadrada, hasta 2 MB, JPG, PNG o WEBP, y borrar la anterior al reemplazar |
| C8 | Consecuencias del borrado, antes de borrar | No existe. La interfaz necesita saber cuántas tarjetas y cuántos clientes se pierden para poder decirlo en el diálogo |
| C9 | Borrado de cuenta real | No existe. Hoy se pide por WhatsApp. Debe borrar también el usuario en Supabase Auth, no solo la fila de Prisma |

**El perfil del cliente final no tiene dónde guardarse.** `Customer` es una fila por tarjeta, no
por persona: alguien con tres tarjetas son tres filas con el mismo correo, y `Customer.email` no
es único. Si el avatar debe existir también para el cliente, hace falta una entidad de persona, o
guardarlo en el usuario de Supabase. Es una decisión de modelo, no de interfaz.

**El borrado arrastra más de lo que parece.** El esquema encadena
`Business` hacia `User`, `LoyaltyCard`, `Customer`, `StampLog` y `MilestoneReward`, todos con
`onDelete: Cascade`. Borrar la cuenta de un administrador que es el único usuario de su negocio
borra el negocio entero y el progreso de todos sus clientes. Hacen falta dos decisiones de
producto antes de implementar:

1. Si el negocio tiene otros administradores, ¿la cuenta se borra y el negocio sobrevive, o se
   exige transferir la propiedad primero?
2. Si es el único administrador, ¿se permite el borrado inmediato, o hay periodo de gracia?

Para el cliente final el caso es más simple: pierde su progreso en las tarjetas donde está
inscrito, y los negocios dejan de verlo en sus listas.

## 4. Lo que está bien y no hay que tocar

- `app/api/cards/route.ts` y `app/api/cards/[id]/route.ts`: validación correcta, `requireRole`, rangos e hitos revisados.
- `app/api/stamps/route.ts`: control de carrera resuelto con `where` condicional y captura de `P2025`; hitos y canjes consistentes. Tiene pruebas en `lib/__tests__/stamps-route.test.ts`.
- `lib/api-utils.ts`: el patrón de sesión, roles y errores que el resto debería seguir (ver B1).

## 5. Cómo verificamos cada quien

- **Frontend:** Playwright con `DEMO_MODE=1`, sin Supabase ni Postgres. Verifica interfaz, estados y navegación. **No prueba backend.**
- **Backend:** `pnpm test` (vitest) y los `e2e/` existentes contra un entorno real. Los cinco specs de `e2e/` hoy dependen de Supabase y de `INVITE_ONLY=false` (`playwright.config.ts:12`).

Cuando cierres B1 y B2, avísame: son los dos que desbloquean el panel nuevo.
