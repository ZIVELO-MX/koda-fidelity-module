# Design system de Koda Fidelity

Fuente para las misiones de implementación. Si algo no está aquí, no se inventa: se pregunta.

Referencias: `wireframe-rediseno.html` para estructura y estados, `loyalty-card-themes.dc.html`
para los temas, `verificadores/contraste-resultado.md` para los límites de contraste medidos.

## 1. Tipografía

| Rol | Familia |
|---|---|
| Interfaz | Switzer de Fontshare, pesos 400 a 800 |
| Cifras que se alinean en columna | JetBrains Mono con `font-variant-numeric: tabular-nums` |
| Acento de marketing | Playfair Display 700 itálica, solo en la landing, de una a tres palabras |

Fallback declarado siempre: `'Söhne', -apple-system, BlinkMacSystemFont, 'Segoe UI', ui-sans-serif`.

Cuerpo base 14px con interlínea 1.5. Etiquetas de sección a 10px, peso 600, mayúsculas y
`tracking` amplio. Playfair no entra nunca en botones, párrafos ni etiquetas, ni dentro del panel.

## 2. Color

### Marca de KODA

| Token | Valor |
|---|---|
| `--brand` | `#FF6B35` |
| `--brand-hover` | `#E8552B` |
| `--brand-pressed` | `#CC4719` |
| `--brand-soft` | `#FFF1E9` |
| `--brand-soft-2` | `#FFE3D4` |
| `--brand-ink` | `#5A1F08` |

### Superficies y tinta

Grises cálidos. Nunca neutros ni azulados.

| Token | Claro | Oscuro |
|---|---|---|
| `--bg` | `#FAFAF7` | `#0D0C0A` |
| `--bg-2` | `#F5F4EE` | `#141210` |
| `--surface` | `#FFFFFF` | `#1A1814` |
| `--surface-2` | `#F7F6F1` | `#221F1A` |
| `--border` | `#EBE9E0` | `#2F2B25` |
| `--border-strong` | `#D9D6C9` | `#3D3830` |
| `--ink` | `#1C1B17` | `#FAFAF7` |
| `--ink-2` | `#5E5A51` | `#CBC6B9` |
| `--ink-3` | `#8E897C` | `#8E897C` |
| `--ink-4` | `#B5B0A4` | `#5E5A51` |

En oscuro la marca se aclara a `#FF7A47`, con suave `#2A1810` y tinta `#FFE1CF`.

### Semánticos

| Token | Claro | Suave | Oscuro |
|---|---|---|---|
| Éxito | `#15803D` | `#E8F5EE` | `#34D399` |
| Aviso | `#B45309` | `#FDF2DC` | `#FBBF24` |
| Error | `#B91C1C` | `#FBEAE9` | `#F87171` |
| Información | `#1E6DB8` | `#E7F0FA` | `#60A5FA` |

El ADN no define fondo suave informativo para tema oscuro. **Queda pendiente de definir ahí**, no
se inventa aquí: reutilizar el claro deja 2.21 de contraste, medido en `verificadores/tokens-resultado.md`.

**Los semánticos nunca se tiñen con el color del negocio.** Verde es verde en todos los negocios.

## 3. Motor de color de marca

El negocio elige su color con un selector libre, así que el valor llega sin garantías. No se
inyecta crudo.

De un color arbitrario se derivan cuatro estados y un color de texto:

- `hover` y `pressed`: el mismo tono, oscurecido de forma proporcional a su luminancia, no con un
  porcentaje fijo. Un tono ya oscuro se oscurece menos.
- `soft` e `ink`: la versión clara para fondos de estado y su tinta legible encima.
- **El color de texto sobre la marca se calcula por contraste, no se fija a blanco.** La función que
  lo decide es la misma de `verificadores/contraste.mjs`: si blanco no alcanza 4.5:1, se usa
  `--ink`.
- **Clamp de luminancia.** Un color demasiado claro o demasiado oscuro se acerca al rango usable
  antes de aplicarse al mueble, para que el foco y los botones sigan viéndose.

Se verifica con al menos seis casos límite: amarillo puro, blanco, negro, un pastel muy claro, un
tono muy saturado y un gris.

## 4. Radios, sombras y densidad

Radios: 4, 6, 8, 10, 14, 18, 24 y 999. Botones e ítems de navegación 10, campos 10, tarjetas 14,
diálogos 18, insignias 999.

Sombras cálidas sobre base `rgba(28,27,23,…)`:

```
xs  0 1px 0 rgba(28,27,23,.04)
sm  0 1px 2px rgba(28,27,23,.06), 0 1px 0 rgba(28,27,23,.03)
md  0 4px 12px rgba(28,27,23,.08), 0 1px 2px rgba(28,27,23,.04)
lg  0 12px 32px rgba(28,27,23,.12), 0 2px 4px rgba(28,27,23,.04)
xl  0 24px 64px rgba(28,27,23,.16), 0 4px 12px rgba(28,27,23,.08)
```

Densidad en tres niveles, con relleno de 10, 14 y 18, y altura de fila de 44, 56 y 64. **El área
táctil no baja de 40px en ningún nivel, y de 44px en cualquier destino de navegación.** El escáner
se opera de pie y a veces con una sola mano.

## 5. Foco

```css
outline: 2px solid var(--brand);
outline-offset: 2px;
```

Global, en todo lo enfocable, y no se elimina en ningún componente. En superficies oscuras el
contorno usa la marca aclarada.

**Sobre superficies claras el contorno de marca se queda en 2.8 de contraste**, por debajo del
mínimo de 3 para elementos de interfaz. Medido en `verificadores/tokens-resultado.md`. Como el token
del ADN no se cambia desde aquí, el foco lleva además un contorno interior oscuro de 1px, o se dibuja
sobre un halo blanco, para que el conjunto supere el mínimo.

Otras tres reglas salen del mismo barrido:

- El borde de un campo no comunica por sí solo: queda en 1.46. La etiqueta visible identifica el
  campo, y el error se marca con color y texto, no solo con el borde.
- `ink-4` no se usa para texto que haya que leer. Un marcador de posición con contenido real usa
  `ink-3`.
- El verde de éxito sobre su fondo suave se queda en 4.47 en texto pequeño. Ahí el texto va en
  `ink` y el color queda como acento.

## 6. Componentes

Cada uno con sus estados. Donde no se nombra un estado, es que no aplica.

### Botón primario
Fondo de marca, texto calculado por contraste, radio 10, altura mínima 44.
Reposo, hover al tono `hover`, foco con el contorno global, `:active` baja `scale(.97)` en 120ms,
deshabilitado al 45% de opacidad sin cambiar de tono.

### Botón secundario
Contorno `--border-strong`, texto `--ink-2`, mismo tamaño y misma respuesta al tacto.

### Botón destructivo
Fondo de error, texto blanco. Nunca es el único botón de un diálogo: siempre acompañado de cancelar,
y el foco entra en cancelar.

### Campo de formulario
Etiqueta visible encima, siempre. **El marcador de posición no hace de etiqueta.** Ayuda opcional
debajo de la etiqueta, error debajo del campo, con el borde en color de error y `aria-invalid`.
Separación de 8px entre los tres.

### Fila de lista
Altura según densidad, separador de 1px `--border`, acción principal visible en la fila y no dentro
de un menú. Hover levanta a `--surface-2`.

### Tarjeta de métrica
Etiqueta pequeña arriba, cifra en mono tabular, comparación debajo. Sin caja cuando la densidad es
alta: basta el aire y una línea.

### Aviso de atención
Fondo suave de aviso, borde del mismo tono, texto de aviso. **Ámbar, no rojo.** Se usa para lo que
requiere una decisión, no para lo que está roto.

### Diálogo de confirmación destructiva
Pregunta con el nombre del objeto dentro, consecuencia cuantificada con datos reales, y para el
cierre de cuenta confirmación escrita. El botón nombra la acción, no dice solo Eliminar.

### Hoja lateral móvil
Se titula con el negocio, no con el nombre del componente. Destinos agrupados, 44px cada uno, pie de
perfil. Cierra con Escape y devuelve el foco al disparador.

### Menú de perfil
Encabezado con foto, nombre y correo. Dos destinos, Mis tarjetas y Configuración. Cerrar sesión
separado abajo.

### Tarjeta de lealtad
Su forma no cambia nunca, ni entre planes ni entre pantallas: cabecera con ícono y negocio, fila de
miembro, sellos en rejilla de cinco por dos, fila de premio, QR centrado y pie con vigencia.

## 7. Movimiento

| Elemento | Duración | Curva |
|---|---|---|
| Presión de botón | 120ms | `ease-out` |
| Sello nuevo | 200ms | `cubic-bezier(.23,1,.32,1)` |
| Menús y selectores | 180ms | `ease-out`, origen en el disparador |
| Hoja móvil | 320ms | `cubic-bezier(.32,.72,0,1)`, interrumpible |
| Cifras del panel | 300ms, escalonadas 60ms | `ease-out`, sin rebote |
| Navegación por teclado | 0ms | no se anima |

Nada entra desde `scale(0)`: el mínimo es `.92` con opacidad. Sin rebote sobre datos, porque el
overshoot en una tabla se lee como descuido. Todo respeta `prefers-reduced-motion`, y bajo esa
preferencia se conservan las transiciones de opacidad y color y se retira el movimiento.

## 8. Temas de tarjeta

La forma es invariable. Lo que cambia es la piel.

**Lite.** Color de marca sólido más el patrón monocromático de su categoría.

**Pro.** Cuatro acabados: gradiente vivo, foil holográfico, patrón cinético y vidrio premium. Los
tres que se mueven se congelan bajo `prefers-reduced-motion`.

**Trece categorías**, cada una con su acento, su ícono de cabecera y el juego de íconos con el que
se genera su patrón. Los nombres son de Lucide.

| Categoría | Acento | Ícono de cabecera | Juego de íconos del patrón |
|---|---|---|---|
| Panadería | `#b45309` | `croissant` | `croissant, wheat, cookie, cake` |
| Taquería | `#dc2626` | `flame` | `flame, citrus, leaf, wheat` |
| Cafetería | `#6f4e37` | `coffee` | `coffee, cookie, croissant, milk` |
| Hamburguesas | `#a16207` | `sandwich` | `sandwich, cup-soda, flame, utensils-crossed` |
| Pizzería | `#b91c1c` | `pizza` | `pizza, flame, leaf, utensils-crossed` |
| Barbería | `#334155` | `scissors` | `scissors, paintbrush, sparkles, star` |
| Salón de Belleza | `#be185d` | `sparkles` | `sparkles, flower-2, star, droplet` |
| Gimnasio | `#0f766e` | `dumbbell` | `dumbbell, timer, heart, droplet` |
| Fútbol | `#15803d` | `trophy` | `trophy, target, medal, flag` |
| Sushi | `#0e7490` | `fish` | `fish, utensils-crossed, leaf, droplet` |
| Veterinaria | `#7c3aed` | `paw-print` | `paw-print, bone, heart, stethoscope` |
| Farmacia | `#0369a1` | `cross` | `pill, cross, syringe, thermometer` |
| Heladería | `#db2777` | `ice-cream-cone` | `ice-cream-cone, ice-cream-bowl, cherry, candy` |


**El patrón se genera**, con un solo grosor, escala y densidad para todas las categorías, de modo
que una categoría nueva entra sin rehacer nada. Expone dos perillas y solo dos: intensidad y radio.

**La intensidad se limita a 27%.** Es el techo medido en `contraste-resultado.md`: por encima de
ese valor, diez de las trece categorías dejan de alcanzar 3:1 en el peor caso. El texto pequeño se
apoya siempre en superficie sólida; solo el nombre del negocio y el de la tarjeta pueden ir sobre el
patrón.

### Cómo se aplica sobre el componente que ya existe

El tema es una piel sobre `components/loyalty-card-preview.tsx`, que ya está en producción y
funciona. **No se rediseña ese componente ni se duplica.** Su anatomía coincide con la de la
referencia de temas: cabecera con chip de ícono o logo, fila de miembro, "Tu Progreso" con la
cuenta, sellos, fila de premio, QR y pie con vigencia y la firma de Koda.

Lo único que el tema añade son tres cosas:

1. El fondo. Hoy el componente pinta `backgroundColor: brandColor`, que es exactamente la piel
   Lite. Las cuatro pieles Pro sustituyen ese fondo por su acabado.
2. Una capa de patrón por encima del fondo y por debajo del contenido, con el juego de íconos de la
   categoría.
3. El ícono del giro dentro de los sellos llenos, que el componente ya soporta mediante
   `stampIconName`.

Valores que se conservan del componente y que este documento no cambia: radio de 24px, superficies
internas al 12% de blanco, pie al 10% de negro y texto secundario al 60%.

- [problem] El componente fija `const fg = "#ffffff"`: el texto de la tarjeta es siempre blanco,
  sin calcular contraste. Con un color de marca claro, el contenido queda ilegible. Es justo lo que
  resuelve el motor de color de la sección 3, y es la razón de que ese motor exista.

**Degradación.** Al bajar de Pro a Lite, el acabado se sustituye por el color que eligió el negocio,
o por `#FF6B35` si no eligió ninguno. Ninguna tarjeta se queda sin identidad.
