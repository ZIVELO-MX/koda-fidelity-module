# FID-0009: wireframe y design system de Fidelity

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Goal:** Entregar la especificación visual verificable que desbloquea las misiones de implementación de Fidelity, sin escribir código de producto.

**Architecture:** Todo vive en `docs/design/` del repositorio `koda-fidelity-module`, como documentos HTML y Markdown autocontenidos más dos verificadores ejecutables. El wireframe anotado ya existe y se conserva; esta misión añade lo que falta: el design system documentado, los contratos de contenido y error, el prototipo navegable del alta, y la verificación real de contraste y accesibilidad. Ningún archivo de `app/`, `components/`, `lib/` o `prisma/` se toca.

**Tech Stack:** HTML y CSS estáticos, Node 24 para los verificadores, `@playwright/test` ya instalado en el repositorio.

**Spec:** `zivelo-knowledge/plans/2026-09-20-fidelity/design.md` y `operaciones-backend.md`, rama `docs/fidelity-backend-audit-plan`. Referencias de diseño: `docs/design/wireframe-rediseno.html` y `docs/design/loyalty-card-themes.dc.html`.

## Global Constraints

- Rama de trabajo: `1.2.0/rulaxx`, sale de `dev` y apunta a `dev`. Traer `dev` antes de cada push. Nunca mergear.
- Esta misión es `farming_quest`: no produce PR de producto. No se toca `app/`, `components/`, `lib/`, `prisma/` ni `package.json`.
- No se agregan funciones, contratos, superficies ni misiones al ciclo. Cualquier hallazgo nuevo se registra en la retrospectiva posterior de Fidelity.
- Tipografía del producto: Switzer de Fontshare para interfaz, JetBrains Mono para cifras que se alinean en columna, con `font-variant-numeric: tabular-nums`.
- Acento de KODA: `#FF6B35`. Hover `#E8552B`. Pressed `#CC4719`. Suave `#FFF1E9` y `#FFE3D4`. Tinta sobre suave `#5A1F08`.
- Grises cálidos, nunca neutros ni azulados: fondo `#FAFAF7`, superficie `#FFFFFF`, borde `#EBE9E0`, borde fuerte `#D9D6C9`, tinta `#1C1B17`, `#5E5A51`, `#8E897C`, `#B5B0A4`.
- Radios: 4, 6, 8, 10, 14, 18, 24 y 999.
- Sombras cálidas sobre base `rgba(28,27,23,…)`.
- Área táctil mínima de 40px, y de 44px en cualquier destino de navegación.
- Foco visible siempre: `outline: 2px solid` del acento con `offset: 2px`. No se elimina en ningún componente.
- Contraste mínimo AA: 4.5:1 en texto normal, 3:1 en texto grande de 18px o más.
- Cero em dash en todo el texto visible.
- La forma de la tarjeta no cambia: cabecera con ícono y negocio, fila de miembro, sellos en rejilla de cinco por dos, fila de premio, QR centrado y pie con vigencia.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `docs/design/wireframe-rediseno.html` | Ya existe. Wireframe anotado de antes y después. No se reescribe, solo se enlaza |
| `docs/design/loyalty-card-themes.dc.html` | Ya existe. Referencia de los trece temas |
| `docs/design/design-system.md` | Nuevo. Tokens y componentes, la fuente que impide que cada implementación invente variantes |
| `docs/design/contratos-de-interfaz.md` | Nuevo. Qué texto y qué estado muestra cada superficie, alineado con `ApiErrorBody`, métricas, actividad y billing |
| `docs/design/prototipo-alta.html` | Nuevo. Prototipo navegable del recorrido del alta |
| `docs/design/verificadores/contraste.mjs` | Nuevo. Calcula contraste de los trece temas y falla si alguno baja de AA |
| `docs/design/verificadores/entrega.spec.ts` | Nuevo. Playwright en 375, 768 y 1440 sobre los documentos y el prototipo |
| `playwright.design.config.ts` | Nuevo. Configuración aparte, sin servidor de desarrollo, para no tocar la del producto |

---

## Task 1: Consolidar la rama de trabajo

**Files:**
- Modify: rama `1.2.0/rulaxx` (sin cambios de contenido propio)

**Interfaces:**
- Consumes: nada
- Produces: una rama con el wireframe y los temas disponibles en `docs/design/`, base de todas las tareas siguientes

- [ ] **Step 1: Traer `dev` y confirmar que no hay divergencia**

```bash
cd /Users/raulmendez/Documents/ZIVELO/koda-fidelity-module
git checkout 1.2.0/rulaxx
git fetch origin
git merge --ff-only origin/dev
git rev-list --count origin/dev..HEAD
```

Esperado: `0` en el último comando si `dev` no ha avanzado, o un merge limpio si sí.

- [ ] **Step 2: Traer los documentos de diseño que ya existen**

```bash
git merge --no-ff origin/design/wireframe-rediseno -m "chore: bring design docs into the working branch"
ls docs/design/
```

Esperado: `wireframe-rediseno.html` y `loyalty-card-themes.dc.html` presentes.

- [ ] **Step 3: Verificar que no entró nada de producto**

```bash
git diff --name-only origin/dev...HEAD | grep -vE '^docs/' && echo "FALLO: hay archivos fuera de docs" || echo "ok: solo docs"
```

Esperado: `ok: solo docs`.

- [ ] **Step 4: Empujar**

```bash
git push -u origin 1.2.0/rulaxx
```

---

## Task 2: Verificador de contraste de los trece temas

Esta tarea existe porque la fuente canónica registra el riesgo así: trece acentos por dos niveles de patrón es donde se cuela un texto ilegible. Verificarlo a ojo no sirve.

**Files:**
- Create: `docs/design/verificadores/contraste.mjs`
- Create: `docs/design/verificadores/contraste-resultado.md`

**Interfaces:**
- Consumes: los trece acentos de `loyalty-card-themes.dc.html`
- Produces: `contraste-resultado.md`, que la Task 3 cita en el design system

- [ ] **Step 1: Escribir el verificador**

```javascript
// docs/design/verificadores/contraste.mjs
// Calcula el contraste WCAG del contenido de la tarjeta sobre cada tema.
// La tarjeta pone texto blanco sobre el acento de su categoría.

const CATEGORIAS = [
  ["Panadería", "#b45309"], ["Taquería", "#dc2626"], ["Cafetería", "#6f4e37"],
  ["Hamburguesas", "#a16207"], ["Pizzería", "#b91c1c"], ["Barbería", "#334155"],
  ["Salón de Belleza", "#be185d"], ["Gimnasio", "#0f766e"], ["Fútbol", "#15803d"],
  ["Sushi", "#0e7490"], ["Veterinaria", "#7c3aed"], ["Farmacia", "#0369a1"],
  ["Heladería", "#db2777"],
];

const BLANCO = "#ffffff";
const AA_NORMAL = 4.5;
const AA_GRANDE = 3.0;

function canal(v) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminancia(hex) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

// El patrón blanco a intensidad máxima aclara el fondo. Se modela como una
// mezcla del acento con blanco al porcentaje de intensidad.
export function mezclarConBlanco(hex, porcentaje) {
  const n = hex.replace("#", "");
  const mezcla = (i) => {
    const c = parseInt(n.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * porcentaje);
  };
  return "#" + [0, 2, 4].map((i) => mezcla(i).toString(16).padStart(2, "0")).join("");
}

export function evaluar() {
  return CATEGORIAS.map(([nombre, acento]) => {
    const base = contraste(BLANCO, acento);
    const conPatron = contraste(BLANCO, mezclarConBlanco(acento, 0.40));
    return {
      nombre,
      acento,
      base: Number(base.toFixed(2)),
      conPatron: Number(conPatron.toFixed(2)),
      pasaNormal: base >= AA_NORMAL,
      pasaGrande: base >= AA_GRANDE,
      pasaConPatron: conPatron >= AA_GRANDE,
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filas = evaluar();
  const fallan = filas.filter((f) => !f.pasaGrande || !f.pasaConPatron);
  for (const f of filas) {
    console.log(
      `${f.pasaGrande && f.pasaConPatron ? "ok  " : "FALLA"} ${f.nombre.padEnd(18)} ${f.acento}  ` +
      `base ${String(f.base).padStart(5)}  con patrón ${String(f.conPatron).padStart(5)}  ` +
      `${f.pasaNormal ? "texto normal AA" : "solo texto grande"}`
    );
  }
  console.log(`\n${filas.length} categorías, ${fallan.length} por debajo de AA`);
  process.exit(fallan.length === 0 ? 0 : 1);
}
```

- [ ] **Step 2: Ejecutarlo y ver qué falla de verdad**

```bash
node docs/design/verificadores/contraste.mjs
```

Esperado: una tabla de trece filas. Es probable que alguna categoría no llegue a 4.5 para texto normal. Eso no es un fallo del verificador, es el hallazgo: anotar cuáles.

- [ ] **Step 3: Escribir el resultado en un documento**

Crear `docs/design/verificadores/contraste-resultado.md` con la tabla que imprimió el paso anterior, y debajo la regla que se deriva de ella. La regla es: las categorías que no alcanzan 4.5 solo pueden usar texto de 18px o más sobre el acento, y el contenido pequeño de la tarjeta se apoya en superficies blancas, como ya hacen los sellos llenos y la fila de miembro.

No inventar números: copiar los que imprimió el script.

- [ ] **Step 4: Commit**

```bash
git add docs/design/verificadores/
git commit -m "docs: add card theme contrast verifier and results"
```

---

## Task 3: Design system documentado

**Files:**
- Create: `docs/design/design-system.md`

**Interfaces:**
- Consumes: `contraste-resultado.md` de la Task 2
- Produces: el documento que las misiones de implementación citan para no inventar variantes

- [ ] **Step 1: Escribir la sección de fundamentos**

El documento abre con tipografía, color, radios, sombras, densidad y foco, con los valores exactos de la sección Global Constraints de este plan. Cada token con su nombre y su valor, sin adjetivos.

- [ ] **Step 2: Escribir la sección de motor de color de marca**

Documentar que el `brandColor` del negocio no se inyecta crudo: se deriva `hover`, `pressed`, `soft` e `ink`, y el color de texto sobre marca se calcula por contraste con la función de la Task 2, no se fija a blanco. Incluir el clamp de luminancia para tonos extremos y la regla de que los colores semánticos de éxito, aviso y error nunca se tiñen.

- [ ] **Step 3: Escribir el catálogo de componentes**

Un bloque por componente, con sus estados. Mínimo: botón primario, secundario y destructivo; campo de formulario con etiqueta, ayuda y error; fila de lista; tarjeta de métrica; aviso de atención; diálogo de confirmación destructiva; hoja lateral móvil; menú de perfil; y la tarjeta de lealtad con su forma invariable.

Cada componente lleva sus cinco estados donde apliquen: reposo, hover, foco, activo y deshabilitado. El botón primario baja `scale(.97)` en `:active` con 120ms.

- [ ] **Step 4: Escribir la sección de movimiento**

Duraciones y curvas exactas: presión de botón 120ms `ease-out`; sello nuevo 200ms `cubic-bezier(.23,1,.32,1)` entrando desde `scale(.92)` y nunca desde cero; menús 180ms con `transform-origin` en el disparador; hoja móvil 320ms `cubic-bezier(.32,.72,0,1)` interrumpible; cifras del panel 300ms escalonadas 60ms sin rebote; navegación por teclado 0ms. Todo respeta `prefers-reduced-motion`.

- [ ] **Step 5: Escribir la sección de temas de tarjeta**

La forma invariable, el catálogo de trece categorías con su acento, el patrón monocromático con sus dos perillas, los dos niveles y la regla de degradación. Enlazar la tabla de contraste de la Task 2 en vez de repetir sus números.

- [ ] **Step 6: Verificar que no hay em dash y que todos los tokens citados existen**

```bash
grep -c "—\|–" docs/design/design-system.md
grep -o "#[0-9A-Fa-f]\{6\}" docs/design/design-system.md | sort -u | wc -l
```

Esperado: `0` em dash. La lista de colores debe corresponder con los de Global Constraints más los trece acentos.

- [ ] **Step 7: Commit**

```bash
git add docs/design/design-system.md
git commit -m "docs: add KODA design system for Fidelity"
```

---

## Task 4: Contratos de contenido, estados y errores

**Files:**
- Create: `docs/design/contratos-de-interfaz.md`

**Interfaces:**
- Consumes: `operaciones-backend.md` de la fuente canónica, para los nombres de campo y códigos
- Produces: el contrato que las implementaciones siguen para no inventar textos

- [ ] **Step 1: Tabla de estados por superficie**

Una fila por superficie confirmada, con lo que muestra en carga, vacío, error, sin permiso y dato parcial. El texto exacto, no una descripción del texto.

- [ ] **Step 2: Sección de errores**

Cómo se presenta un error tipado: mensaje en el sitio donde ocurrió, `code` y `requestId` en texto pequeño copiables de un toque, `action` como etiqueta del botón de salida cuando la acción es evidente, y `retryable` decidiendo si se ofrece reintentar. Nunca mostrar la referencia sin el código ni al revés.

- [ ] **Step 3: Sección de métricas y actividad**

Qué hace la interfaz cuando una métrica llega nula, cuando la serie diaria está vacía y cuando la actividad viene paginada por cursor. La regla que ya está en la fuente canónica: un dato que no es confiable se marca como parcial, nunca se presenta como cero.

- [ ] **Step 4: Sección de billing**

Los estados del alta y la suscripción que la interfaz representa, con los nombres exactos que usa la fuente canónica.

- [ ] **Step 5: Verificar que no se inventó ningún código ni campo**

```bash
grep -o "KF-[A-Z]*-[0-9]*" docs/design/contratos-de-interfaz.md | sort -u > /tmp/citados.txt
wc -l < /tmp/citados.txt
```

Cada código citado debe existir en `operaciones-backend.md` de la fuente canónica. Comprobar uno por uno; si alguno no existe, borrarlo del documento en vez de proponerlo.

- [ ] **Step 6: Commit**

```bash
git add docs/design/contratos-de-interfaz.md
git commit -m "docs: add interface content and error contracts"
```

---

## Task 5: Estados de recuperación para FID-0013

**Files:**
- Modify: `docs/design/contratos-de-interfaz.md`

**Interfaces:**
- Consumes: la Task 4
- Produces: la especificación que `FID-0013` consumirá cuando se desbloquee

- [ ] **Step 1: Escribir la sección de recuperación**

Las siete pantallas de acceso están bloqueadas, pero su especificación de estados sí entra en esta misión. Documentar qué ve la persona en: enlace expirado, demasiados intentos, correo no registrado, invitación inválida o ya usada, contraseña temporal pendiente de cambio, y sesión sin negocio asociado.

- [ ] **Step 2: Marcar la dependencia**

Anotar en esa sección que su implementación pertenece a `FID-0013`, que depende de `FID-0004`, y que ninguno de esos estados se implementa en este ciclo.

- [ ] **Step 3: Commit**

```bash
git add docs/design/contratos-de-interfaz.md
git commit -m "docs: specify recovery states for the blocked access screens"
```

---

## Task 6: Prototipo navegable del alta

**Files:**
- Create: `docs/design/prototipo-alta.html`

**Interfaces:**
- Consumes: los tokens de la Task 3
- Produces: el recorrido que la Task 7 verifica en tres anchos

- [ ] **Step 1: Escribir el esqueleto con las seis pantallas**

Un solo archivo HTML con seis secciones: intro, datos, tarjeta, Club, atribución y muro de pago, más el estado de regreso sin pagar. Solo una visible a la vez, conmutada con `hidden`, sin librerías.

- [ ] **Step 2: Conectar la navegación**

Botones de continuar, saltar y salir que mueven entre secciones. El progreso se refleja en la barra superior. Saltar solo aparece en intro y atribución, que son las dos saltables.

- [ ] **Step 3: Aplicar los tokens**

Los mismos valores del design system. Nada de colores sueltos.

- [ ] **Step 4: Verificar el recorrido a mano**

```bash
open docs/design/prototipo-alta.html
```

Recorrer intro, datos, tarjeta, Club, atribución y muro de pago. Comprobar que saltar funciona en las dos saltables y que salir del muro lleva al estado de regreso sin pagar.

- [ ] **Step 5: Commit**

```bash
git add docs/design/prototipo-alta.html
git commit -m "docs: add navigable onboarding prototype"
```

---

## Task 7: Verificación responsive y de accesibilidad

**Files:**
- Create: `playwright.design.config.ts`
- Create: `docs/design/verificadores/entrega.spec.ts`

**Interfaces:**
- Consumes: el wireframe, el design system y el prototipo
- Produces: capturas en tres anchos y las comprobaciones que cierran la misión

- [ ] **Step 1: Escribir la configuración aparte**

```typescript
// playwright.design.config.ts
// Configuración separada de la del producto: no levanta el servidor de
// desarrollo porque estos documentos son archivos estáticos.
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./docs/design/verificadores",
  fullyParallel: true,
  use: { locale: "es-MX" },
  projects: [
    { name: "movil", use: { viewport: { width: 375, height: 812 } } },
    { name: "tableta", use: { viewport: { width: 768, height: 1024 } } },
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 } } },
  ],
})
```

- [ ] **Step 2: Escribir las comprobaciones**

```typescript
// docs/design/verificadores/entrega.spec.ts
import { test, expect } from "@playwright/test"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"

const documentos = [
  { nombre: "wireframe", ruta: "docs/design/wireframe-rediseno.html" },
  { nombre: "prototipo", ruta: "docs/design/prototipo-alta.html" },
]

for (const doc of documentos) {
  test(`${doc.nombre} no desborda horizontalmente`, async ({ page }, info) => {
    await page.goto(pathToFileURL(resolve(doc.ruta)).href)
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(desborda, `${doc.nombre} desborda en ${info.project.name}`).toBe(false)
    await page.screenshot({
      path: `docs/design/verificadores/capturas/${doc.nombre}-${info.project.name}.png`,
      fullPage: true,
    })
  })

  test(`${doc.nombre} no contiene em dash`, async ({ page }) => {
    await page.goto(pathToFileURL(resolve(doc.ruta)).href)
    const texto = await page.evaluate(() => document.body.innerText)
    expect(texto).not.toContain("—")
    expect(texto).not.toContain("–")
  })
}

test("el prototipo recorre el alta completa", async ({ page }) => {
  await page.goto(pathToFileURL(resolve("docs/design/prototipo-alta.html")).href)
  for (const paso of ["datos", "tarjeta", "club", "atribucion", "paywall"]) {
    await page.getByTestId(`continuar-${paso}`).click()
    await expect(page.getByTestId(`pantalla-${paso}`)).toBeVisible()
  }
})

test("todo destino de navegación llega a 44px de alto", async ({ page }) => {
  await page.goto(pathToFileURL(resolve("docs/design/prototipo-alta.html")).href)
  const botones = await page.getByRole("button").all()
  for (const boton of botones) {
    const caja = await boton.boundingBox()
    if (caja) expect(caja.height).toBeGreaterThanOrEqual(44)
  }
})
```

- [ ] **Step 3: Ejecutar y corregir lo que falle**

```bash
npx playwright test --config playwright.design.config.ts
```

Esperado: las tres proyecciones pasan. Si una falla por desbordamiento o por área táctil, se corrige el documento, no la prueba.

- [ ] **Step 4: Confirmar que no se tocó la configuración del producto**

```bash
git diff --name-only origin/dev...HEAD | grep -E '^(app|components|lib|prisma)/|^playwright.config.ts$' && echo "FALLO" || echo "ok: producto intacto"
```

Esperado: `ok: producto intacto`.

- [ ] **Step 5: Commit**

```bash
git add playwright.design.config.ts docs/design/verificadores/
git commit -m "docs: verify design deliverables at three widths"
```

---

## Task 8: Cierre de la misión

**Files:**
- Modify: ninguno del repositorio

**Interfaces:**
- Consumes: todo lo anterior
- Produces: `FID-0009` con sus casillas marcadas y la entrega enlazada

- [ ] **Step 1: Empujar la rama con `dev` al día**

```bash
git fetch origin && git merge --ff-only origin/dev
git push
```

- [ ] **Step 2: Marcar en TLOZ solo las casillas con evidencia**

Actualizar el documento de `FID-0009` marcando las casillas que tengan entregable verificable. Una casilla sin archivo o sin salida de verificación se queda sin marcar. Usar el identificador interno de la misión, no el legible, porque la ruta de estado devuelve 500 con el legible.

- [ ] **Step 3: Verificar el resultado**

```bash
ZIPFORM_TOKEN=... tloz-api /api/v1/missions/FID-0009 GET
```

Esperado: `progress` y `completed` reflejan lo marcado.

- [ ] **Step 4: Informar qué quedó sin marcar y por qué**

Si alguna casilla no se pudo cerrar, decirlo con su razón en vez de marcarla.

---

## Self-Review

**Cobertura de la especificación.** Las 19 casillas de `FID-0009` quedan cubiertas así: las siete de wireframe ya están entregadas en `wireframe-rediseno.html` y la Task 1 las incorpora a la rama; design system y componentes en la Task 3; contratos en la Task 4; recuperación en la Task 5; prototipo navegable en la Task 6; revisión en tres anchos y accesibilidad en la Task 7; las ocho de temas de tarjeta se reparten entre la Task 2, que verifica el contraste, y la Task 3, que documenta forma, catálogo, patrón, niveles y degradación.

**Marcadores de relleno.** No hay ninguno. Los verificadores traen código completo y ejecutable, y los documentos tienen su contenido descrito por secciones con los valores exactos en Global Constraints.

**Consistencia de nombres.** `contraste()` y `mezclarConBlanco()` de la Task 2 se citan igual en la Task 3. Los `data-testid` del prototipo en la Task 6 (`continuar-<paso>`, `pantalla-<paso>`) son los que consume la Task 7. Las rutas de archivo coinciden con la tabla de File Structure.

**Riesgo conocido.** La Task 2 puede revelar que varias de las trece categorías no alcanzan 4.5:1 para texto normal. Eso no bloquea la entrega: la regla derivada es que esas categorías usan texto grande sobre el acento y apoyan el contenido pequeño en superficies blancas. Si el resultado obligara a cambiar acentos, es un hallazgo para la retrospectiva posterior, no un cambio de alcance en este ciclo.
