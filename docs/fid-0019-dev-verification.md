# Verificación de FID-0019 en development

Esta comprobación requiere acceso al proyecto Supabase de development y a su buzón SMTP. No se
deben copiar tokens, enlaces completos ni contraseñas en tickets, commits o evidencias.

## Recuperación

1. Usa una cuenta de prueba dedicada y solicita recuperación desde `/login`.
2. Confirma en el buzón de development que llega un mensaje nuevo de recuperación.
3. Abre el enlace una sola vez y verifica que termina en `/dashboard/update-password`.
4. Cambia la contraseña y entra con la nueva contraseña.
5. Abre de nuevo el mismo enlace: debe terminar en `/auth/error`.
6. Solicita un enlace inválido o vencido: debe terminar en `/auth/error` sin cambiar la sesión.

Registra únicamente fecha, entorno, asunto/remitente y los destinos observados. La vigencia del
enlace se toma de la configuración efectiva de Supabase Auth (`GOTRUE_MAILER_OTP_EXP`); el template
no fija una duración propia.

## Portal sin tarjetas

Con una sesión autenticada cuyo correo no tenga tarjetas, solicita:

```text
GET /api/join?email=<correo-de-la-sesión>
```

El resultado esperado es HTTP 200 con `{ "customers": [] }`. Un correo distinto al de la sesión
debe responder con el error de autorización correspondiente.

## Evidencia

Adjunta a FID-0019 el entorno, fecha, commit de la aplicación y resultado de cada paso. La suite
aislada de CI ya cubre recuperación, reutilización del enlace y colección vacía; esta ejecución
confirma que la configuración SMTP compartida coincide con ella.
