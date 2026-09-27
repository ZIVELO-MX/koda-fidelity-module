# Contraste del texto de la tarjeta sobre el color del negocio

Generado con `pnpm exec tsx docs/design/verificadores/contraste-marca.ts`. Los números salen
de `pielDeTarjeta` y `contraste`, el mismo código que pinta la aplicación, no de una copia de
la fórmula.

Esto es distinto de [`contraste-resultado.md`](contraste-resultado.md), que mide los trece
acentos de categoría sobre el patrón. Aquí se miden los **seis colores del selector de marca**
sobre el fondo de la tarjeta.

## El defecto

La tarjeta llevaba el texto en blanco fijo y su fondo se aclaraba un 16% por decoración
(`mezclar(brandColor, 255, 0.16)`). El punto más claro del degradado cae en `18% 4%`, la
esquina superior izquierda: justo donde está la cabecera. Medido sobre ese punto:

| Color | Marca | Punto claro | Blanco | Blanco al 60% |
|---|---|---|---|---|
| Naranja | `#f97316` | `#FA893B` | 2.41 | 1.70 |
| Azul | `#3b82f6` | `#5A96F7` | 2.94 | 1.97 |
| Verde | `#10b981` | `#36C495` | 2.21 | 1.60 |
| Violeta | `#8b5cf6` | `#9E76F7` | 3.29 | 2.13 |
| Rosa | `#ec4899` | `#EF65A9` | 2.96 | 1.93 |
| Ámbar | `#f59e0b` | `#F7AE32` | 1.90 | 1.47 |

Ninguno de los seis llegaba a 4.5:1, y cinco quedaban por debajo de 3.0 incluso con el blanco
puro. Las etiquetas pequeñas -- «Tarjeta de Lealtad», «Miembro», «Premio», «Vence» y el pie --
iban además al 60% y 70% de opacidad, entre **1.47 y 2.13**. El peor contraste de la tarjeta
coincidía con su letra más chica.

## El cambio

Tres cosas, todas reutilizando `contraste` y `mezclar` de `lib/color-marca`:

1. **El fondo deja de aclararse.** El extremo claro del degradado pasa a ser el color del
   negocio tal cual. Aclararlo era decoración que costaba legibilidad.
2. **El color del texto se elige por contraste**, como ya hacía `derivarMarca` para los botones.
   Se prueban blanco y tinta, y gana **el que exija mover menos el color del negocio**, no el
   que arranque con más contraste: elegir primero el texto y compensar después aclaraba tanto la
   base que un naranja se pintaba durazno.
3. **Las placas y el pie se apartan del texto.** Antes la placa de «Miembro» y «Premio» aclaraba
   el fondo un 12% y el pie lo oscurecía, así que un solo color de texto tenía que sobrevivir a
   las dos direcciones. Ahora aclaran cuando el texto es tinta y oscurecen cuando es blanco, y
   las etiquetas pequeñas dejan de ir atenuadas: la jerarquía la dan el tamaño y el peso.

Tres de los seis colores no se tocan (`#f97316`, `#10b981`, `#f59e0b`). Los otros tres se
ajustan lo justo para llegar a 4.5. Ningún acabado cambió su carácter: `gradiente` conserva su
profundidad de 0.5.

## Resultado

Los treinta pares de color y acabado llegan a AA (4.5:1).

### Lite

| Color | Marca | Base pintada | Texto | Peor contraste |
|---|---|---|---|---|
| Naranja | `#f97316` | `#F97316` | tinta | 4.83 |
| Azul | `#3b82f6` | `#3472D8` | blanco | 4.62 |
| Verde | `#10b981` | `#10B981` | tinta | 5.33 |
| Violeta | `#8b5cf6` | `#8558EC` | blanco | 4.56 |
| Rosa | `#ec4899` | `#CD3F85` | blanco | 4.52 |
| Ámbar | `#f59e0b` | `#F59E0B` | tinta | 6.25 |

### gradiente

| Color | Marca | Base pintada | Texto | Peor contraste |
|---|---|---|---|---|
| Naranja | `#f97316` | `#BD5711` | blanco | 4.63 |
| Azul | `#3b82f6` | `#3472D8` | blanco | 4.62 |
| Verde | `#10b981` | `#0C875E` | blanco | 4.52 |
| Violeta | `#8b5cf6` | `#8558EC` | blanco | 4.56 |
| Rosa | `#ec4899` | `#CD3F85` | blanco | 4.52 |
| Ámbar | `#f59e0b` | `#A46A07` | blanco | 4.52 |

### foil

| Color | Marca | Base pintada | Texto | Peor contraste |
|---|---|---|---|---|
| Naranja | `#f97316` | `#F97D26` | tinta | 5.14 |
| Azul | `#3b82f6` | `#2E65C0` | blanco | 5.62 |
| Verde | `#10b981` | `#10B981` | tinta | 5.33 |
| Violeta | `#8b5cf6` | `#764ED1` | blanco | 5.55 |
| Rosa | `#ec4899` | `#B83877` | blanco | 5.43 |
| Ámbar | `#f59e0b` | `#F59E0B` | tinta | 6.25 |

### cinetico

| Color | Marca | Base pintada | Texto | Peor contraste |
|---|---|---|---|---|
| Naranja | `#f97316` | `#FA8432` | tinta | 5.40 |
| Azul | `#3b82f6` | `#2E65C0` | blanco | 5.62 |
| Verde | `#10b981` | `#12BA82` | tinta | 5.40 |
| Violeta | `#8b5cf6` | `#764ED1` | blanco | 5.55 |
| Rosa | `#ec4899` | `#B83877` | blanco | 5.43 |
| Ámbar | `#f59e0b` | `#F59E0B` | tinta | 6.25 |

### vidrio

| Color | Marca | Base pintada | Texto | Peor contraste |
|---|---|---|---|---|
| Naranja | `#f97316` | `#9F4A0E` | blanco | 6.07 |
| Azul | `#3b82f6` | `#2C60B6` | blanco | 6.08 |
| Verde | `#10b981` | `#5ACFA8` | tinta | 6.94 |
| Violeta | `#8b5cf6` | `#6F4AC5` | blanco | 6.07 |
| Rosa | `#ec4899` | `#AF3571` | blanco | 5.88 |
| Ámbar | `#f59e0b` | `#F7AD30` | tinta | 6.96 |

## Resultado visual

![Antes](capturas/tarjetas-contraste-antes.png)

![Después](capturas/tarjetas-contraste-despues.png)

Las dos capturas salen del componente real renderizado con `react-dom/server` y la hoja de
estilos compilada, no de una maqueta. Los seis colores siguen siendo reconocibles: el naranja
sigue naranja y el ámbar sigue ámbar. Lo que cambia es que las etiquetas pequeñas se leen.

## Límites de esta medición

- **Se mide el texto, no los gráficos.** Dos cosas quedan fuera y sin cambiar: el ícono del
  sello de hito, que va en blanco sobre `brandColor` (2.15 con ámbar), y el QR, que se pinta con
  `brandColor` sobre blanco. El QR es el que más me preocupa de los dos, porque un contraste
  bajo puede afectar al lector, no solo a la vista. Ninguno es regresión de este cambio: los dos
  ya estaban así. Quedan anotados para decidir aparte.
- **El velo de cada acabado se modela por su desplazamiento máximo**, no píxel a píxel. Es un
  modelo de peor caso, igual que el de `contraste-resultado.md`.
- La garantía está fijada en `lib/__tests__/contraste-de-tarjeta.test.ts`, que recorre los seis
  colores por los cinco acabados. Contra el código anterior fallan 31 de sus 32 pruebas.
