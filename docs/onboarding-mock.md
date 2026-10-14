# Onboarding mock de development

El mock permite recorrer y validar el contrato real del onboarding sin crear ni modificar
`Business`, `OnboardingProgress`, `LoyaltyCard`, `Subscription` o auditorías.

Requisitos:

- `.env.development.local` apuntando a development;
- `FID_DEBUG_AUTH=true`;
- un usuario existente tanto en Supabase Auth como en la tabla `User`;
- catálogos de categorías y temas activos.

Ejecuta:

```bash
pnpm onboarding:mock -- fidelity.seed.portal@dev.invalid
```

El comando levanta Next en `http://localhost:3000`, inicia el estado en `INTRO` y conserva los
borradores únicamente en memoria mientras el proceso está vivo. Se puede cambiar el puerto:

```bash
pnpm onboarding:mock -- fidelity.seed.portal@dev.invalid --port 3100
```

El usuario debe iniciar sesión normalmente y abrir `/onboarding`. El proceso rechaza a cualquier
sesión cuyo correo no sea el objetivo. Ctrl+C descarta todo el estado mock.

Las respuestas de `/api/onboarding` llevan `mode: "mock"` durante esta sesión y `mode: "live"`
en el flujo normal. La interfaz debe mostrar un aviso persistente de que los datos se validan pero
no se guardan.
