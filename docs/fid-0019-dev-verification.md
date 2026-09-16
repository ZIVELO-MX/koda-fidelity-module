# Verificación de FID-0019 en development

La evidencia automatizada se ejecuta en CI con Supabase local y Mailpit. No se deben copiar tokens,
enlaces completos ni contraseñas en tickets, commits o evidencias.

## Recuperación

1. Usa una cuenta de prueba dedicada y solicita recuperación desde `/login`.
2. Confirma en el buzón de development que llega un mensaje nuevo de recuperación.
3. Abre el enlace una sola vez y verifica que termina en `/dashboard/update-password`.
4. Cambia la contraseña y entra con la nueva contraseña.
5. Abre de nuevo el mismo enlace: debe terminar en `/auth/error`.
6. Solicita un enlace vencido en el entorno aislado: CI envejece `auth.users.recovery_sent_at` más
   allá de una hora y verifica `otp_expired`, sin cambiar la contraseña original. Un enlace inválido
   también debe terminar en `/auth/error` sin cambiar la sesión.

Registra únicamente fecha, entorno, asunto/remitente y los destinos observados. En CI la vigencia
está fijada en `supabase/config.toml` (`auth.email.otp_expiry = 3600`, una hora); el template local
`supabase/templates/recovery.html` no puede ampliar esa vigencia.

## Portal sin tarjetas

Con una sesión autenticada cuyo correo no tenga tarjetas, solicita:

```text
GET /api/join?email=<correo-de-la-sesión>
```

El resultado esperado es HTTP 200 con `{ "customers": [] }`. Un correo distinto al de la sesión
debe responder con el error de autorización correspondiente.

## Evidencia

Adjunta a FID-0019 el entorno, fecha, commit de la aplicación y resultado de cada paso. La suite
aislada de CI cubre recuperación, reutilización del enlace, expiración real, tipo inválido y
colección vacía. Los helpers identifican únicamente mensajes nuevos de Mailpit y el test de contrato
comprueba que el TTL y el template configurados siguen presentes.
