# Configuración de Correos Electrónicos

Datos utilizados en los templates de email (magic link, confirmación, etc.).
Actualizar cuando se tengan los valores reales de producción.

## Datos del Proyecto

| Variable | Valor actual | Producción |
|----------|-------------|------------|
| Nombre del producto | `Koda Fidelity` | |
| Nombre corto | `Koda` | |
| URL del sitio | `{{ .SiteURL }}` (se resuelve desde Supabase) | |
| Color principal | `#f97316` (naranja) | |
| Email de soporte | `contacto@zivelo.dev` | |
| Logo en correos | Letra "K" en círculo naranja `#f97316` | |
| Idioma | Español (es_MX) | |

## Redirección Post-Login

| Tipo de usuario | Ruta |
|----------------|------|
| Administradores (dashboard) | `/dashboard` |
| Clientes (tarjetas) | `/dashboard/my-cards` |
| Recuperación de contraseña | `/dashboard/update-password` |

## Templates de Supabase

Se editan en: **Supabase Dashboard → Authentication → Email Templates**

| Template | Archivo local | Estado |
|----------|--------------|--------|
| Magic Link | `docs/email-templates/magic-link.html` | ✅ Personalizado |
| Confirmación | (default de Supabase) | ⬜ Pendiente |
| Cambio de contraseña | (default de Supabase) | ⬜ Pendiente |
| Cambio de email | (default de Supabase) | ⬜ Pendiente |

## Variables de Supabase para Templates

```
{{ .SiteURL }}       — URL base del sitio
{{ .Email }}         — Correo del destinatario
{{ .TokenHash }}     — Hash del token de autenticación
{{ .RedirectTo }}    — URL de redirección post-login
{{ .ConfirmationURL }} — URL completa de confirmación
{{ .Token }}         — Token (para reset de contraseña)
```

## Configuración de Envío (Supabase)

| Parámetro | Valor |
|-----------|-------|
| SMTP Provider | (default Supabase) |
| Remitente | `noreply@app.mgzledffujjnunawgymc.supabase.co` |
| | |

La vigencia del enlace de recuperación la controla Supabase Auth. En el entorno local de CI está
fijada en `auth.email.otp_expiry = 3600` (una hora); el enlace es de un solo uso y
`/auth/confirm` rechaza tipos no soportados y destinos externos.

> Nota: Para usar un remitente personalizado (ej. `noreply@koda.app`),
> configurar SMTP custom en Supabase Dashboard → Authentication → Settings.
