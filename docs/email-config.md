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
| Clientes (tarjetas) | `/my-cards` |

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

> Nota: Para usar un remitente personalizado (ej. `noreply@koda.app`),
> configurar SMTP custom en Supabase Dashboard → Authentication → Settings.
