# Entregables de diseño

- `wireframe-rediseno.html` — wireframe anotado de antes y después.
- `design-system.md` — tokens, motor de color, componentes, movimiento y temas.
- `contratos-de-interfaz.md` — estados por superficie, errores, métricas, facturación y recuperación.
- `prototipo-alta.html` — recorrido navegable del alta, con las trece categorías y las cinco pieles.
- `loyalty-card-themes.dc.html` — referencia de temas.
- `verificadores/` — contraste de los trece temas y verificación en tres anchos.

## Para ver el documento de temas completo

`loyalty-card-themes.dc.html` genera dos de sus rejillas en tiempo de ejecución y necesita su motor,
`support.js`, que es de terceros y no se versiona. Cópialo junto al documento antes de abrirlo, o
esas dos secciones aparecerán vacías y solo verás las siete tarjetas estáticas.

## Para verlo todo en el navegador

```bash
cd docs/design && python3 -m http.server 4173 --bind 127.0.0.1
```

## Para verificar

```bash
node docs/design/verificadores/contraste.mjs
npx playwright test --config playwright.design.config.ts
```

La primera sale con código 1 a propósito: reporta que diez de las trece categorías caen por debajo
de AA con el patrón al máximo, que es el hallazgo que fija el techo de la perilla en 27%.
