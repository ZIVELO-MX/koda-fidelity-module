# Landing Page — Mejoras Pendientes

Observaciones post-polish (junio 2026). No son urgentes pero aumentarían conversión y credibilidad.

---

## 1. Testimoniales ⭐ Alta prioridad

**Problema:** La sección de Use Cases dice *"cientos de negocios ya usan Koda"* pero no hay ninguna voz real que lo respalde. Sin testimoniales, esa frase no convence.

**Propuesta:** 3 quotes con nombre, tipo de negocio y calificación (estrellitas). Formato tarjeta, una fila horizontal.

**Impacto esperado:** Alto — es el elemento que más convierte en landing pages de SaaS para pequeños negocios.

---

## 2. Sección de números grandes

**Problema:** No hay métricas visibles. La landing se siente como "promesas" sin evidencia cuantificable.

**Propuesta:** Un bloque de fondo oscuro (cohesivo con el marquee) con 3 stats grandes:

```
+2,000 sellos registrados   ·   98% clientes regresan   ·   Setup en 2 min
```

**Impacto esperado:** Alto — rompe la monotonía visual y da credibilidad inmediata.

---

## 3. FAQ — Preguntas Frecuentes

**Problema:** Un visitante tiene dudas antes de registrarse. Si no encuentra respuesta, se va.

**Preguntas clave a cubrir:**
- ¿Mis clientes necesitan descargar una app?
- ¿Cuánto cuesta Koda Fidelity?
- ¿Puedo personalizar el diseño de mi tarjeta?
- ¿Qué pasa si cancelo mi cuenta?
- ¿Es seguro el acceso por QR?

**Formato:** Acordeón simple (shadcn `Accordion`).

**Impacto esperado:** Medio-alto — reduce fricción antes del signup.

---

## 4. Pricing más claro

**Problema:** La sección de precios actual solo dice "precios accesibles" sin ningún número ni tier. Genera desconfianza.

**Propuesta:** Aunque sea beta, mostrar algo como:

```
Gratis durante beta
✓ Hasta 3 tarjetas activas
✓ Sellos y canjes ilimitados
✓ Analytics básicos
✓ Soporte por email
```

**Impacto esperado:** Medio — reduce la principal objeción ("¿cuánto me va a costar?").

---

## Lo que NO agregar

- Más tarjetas de features — ya hay suficientes
- Más casos de uso — el marquee band los cubre
- Screenshots del dashboard — la UI aún no está lista para mostrarse como hero image

---

## Monotonía visual

El problema de fondo no es falta de secciones sino que cada sección sigue el mismo patrón:
`heading + párrafo + grid de cards`. El ojo se desconecta.

El marquee ayuda a romper ese ritmo. La sección de números grandes (punto 2) también lo haría.
Considerar alternar fondos y layouts en lugar de agregar más secciones iguales.
