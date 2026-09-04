# Contraste de los pares de tokens

Generado con `node docs/design/verificadores/tokens.mjs` el 2026-09-03. Treinta y dos pares, los
dieciséis que autoriza el design system en cada tema.

**Veinticuatro pasan. Ocho no.** Ninguno de los ocho es del rediseño: son tokens del ADN de KODA o
un error de este documento. Se separan por naturaleza porque tienen dueños distintos.

## 1. Error de este documento, ya identificado

| Par | Tema | Ratio | Mínimo |
|---|---|---|---|
| `info` sobre `info-soft` | oscuro | 2.21 | 4.5 |

El ADN define el color informativo para tema oscuro, `#60A5FA`, pero no su fondo suave. Al escribir
el design system reutilicé el suave del tema claro, `#E7F0FA`, que en oscuro deja texto azul claro
sobre fondo casi blanco. **Es un token que no debí completar por mi cuenta.** Queda marcado como
pendiente de definir en el ADN, no inventado aquí.

## 2. Tokens del ADN que no alcanzan el mínimo

Afectan a todo KODA, no solo a Fidelity, así que no se cambian desde este ciclo.

| Par | Tema | Ratio | Mínimo | Para qué se usa |
|---|---|---|---|---|
| `brand` sobre `bg` | claro | 2.71 | 3.0 | contorno de foco |
| `brand` sobre `surface` | claro | 2.84 | 3.0 | contorno de foco |
| `border-strong` sobre `surface` | claro | 1.46 | 3.0 | borde de campo de formulario |
| `border-strong` sobre `surface` | oscuro | 1.53 | 3.0 | borde de campo de formulario |
| `ink-4` sobre `surface` | claro | 2.16 | 3.0 | marcador de posición e íconos inactivos |
| `ink-4` sobre `surface` | oscuro | 2.58 | 3.0 | marcador de posición e íconos inactivos |

El más serio es el primero: **el contorno de foco en tema claro no llega a 3:1**, y el foco es
precisamente el elemento de accesibilidad que no puede fallar. En oscuro sí pasa con holgura, 7.57.

## 3. Al límite

| Par | Tema | Ratio | Mínimo |
|---|---|---|---|
| `exito` sobre `exito-soft` | claro | 4.47 | 4.5 |

Se queda a tres centésimas. En texto grande cumple de sobra. Vale la pena saberlo antes de usarlo
en texto pequeño.

## Reglas que se derivan, sin tocar el ADN

1. **El contorno de foco no se apoya solo en el color de marca.** Sobre superficies claras lleva
   además un contorno interior oscuro de 1px, o se dibuja sobre un halo blanco, para que el
   conjunto supere 3:1 sin cambiar el token.
2. **El borde de un campo no comunica nada por sí solo.** La etiqueta visible encima es la que
   identifica el campo, y el estado de error se marca además con color de error y texto, no solo
   con el borde.
3. **`ink-4` no se usa para texto que haya que leer.** Marcadores de posición con contenido real
   pasan a `ink-3`, y `ink-4` queda para decoración y separadores.
4. **El verde de éxito, en texto pequeño, se apoya en `ink` y usa el color solo como acento.**

## Qué hacer con esto

Los seis pares de la sección 2 y el de la sección 1 se registran en la retrospectiva de Fidelity
como hallazgos para el ADN de KODA. No se corrigen en este ciclo porque el ADN gobierna todos los
módulos y su cambio no es una decisión de un rediseño.
