# Contraste de los temas de tarjeta

Generado con `node docs/design/verificadores/contraste.mjs` el 2026-09-03. Los números salen del
script, no de una estimación.

## Qué se midió

El contenido de la tarjeta es texto blanco sobre el acento de su categoría. Se midieron dos
situaciones: sobre el acento limpio, y en el peor caso del patrón, que es un píxel de texto que cae
justo encima de un trazo del patrón blanco a la intensidad máxima que permite la perilla.

## Resultado

| Categoría | Acento | Sobre el acento | Con patrón al 40% |
|---|---|---|---|
| Panadería | `#b45309` | 5.02 | 2.49 |
| Taquería | `#dc2626` | 4.83 | 2.72 |
| Cafetería | `#6f4e37` | 7.44 | 2.86 |
| Hamburguesas | `#a16207` | 4.92 | 2.40 |
| Pizzería | `#b91c1c` | 6.47 | 3.12 |
| Barbería | `#334155` | 10.35 | 3.35 |
| Salón de Belleza | `#be185d` | 6.04 | 3.04 |
| Gimnasio | `#0f766e` | 5.47 | 2.56 |
| Fútbol | `#15803d` | 5.02 | 2.46 |
| Sushi | `#0e7490` | 5.36 | 2.53 |
| Veterinaria | `#7c3aed` | 5.70 | 2.72 |
| Farmacia | `#0369a1` | 5.93 | 2.69 |
| Heladería | `#db2777` | 4.60 | 2.62 |

**Las trece categorías pasan AA de texto normal sobre el acento limpio.** El acento más justo es
Heladería con 4.60, y aun así queda por encima del mínimo de 4.5.

**Diez de trece caen por debajo de 3:1 con el patrón al máximo**, que es ni siquiera el umbral de
texto grande.

## Techo seguro de la perilla de intensidad

Buscando el valor más alto en el que las trece categorías se mantienen sobre el umbral:

| Umbral | Intensidad máxima | Peor categoría en ese punto |
|---|---|---|
| 3:1, texto grande | **27%** | 3.03 |
| 4.5:1, texto normal | 1% | 4.56 |

En el valor por defecto del prototipo, 22%, las trece se mantienen sobre 3:1, pero solo Pizzería y
Barbería conservan 4.5:1.

## Reglas que se derivan

1. **La perilla de intensidad se limita a 27%, no a 40%.** El prototipo permite hasta 40 y ese
   rango produce texto ilegible en diez de trece categorías.
2. **El texto pequeño nunca se apoya en el patrón.** Va sobre superficies sólidas, como ya hace la
   tarjeta con los sellos llenos, la fila de miembro, la fila de premio y el QR.
3. **Solo el texto de 18px o más puede ir directamente sobre el acento con patrón**, y dentro del
   techo de 27%.
4. El nombre del negocio y el de la tarjeta, que son los dos textos grandes de la cabecera, son los
   únicos que pueden vivir sobre el patrón.

## Límite de esta medición

El modelo es de peor caso: supone que el píxel de texto cae exactamente sobre un trazo del patrón,
donde el aclarado es máximo. En la mayor parte de la superficie el fondo es el acento limpio, así
que la tarjeta real se lee mejor que estos números. Se midió el peor caso a propósito, porque es el
que decide si una regla es segura.

Si en algún momento se decide subir la intensidad por encima de 27%, hay que cambiar los acentos de
las categorías afectadas o poner el texto sobre superficie sólida. Eso sería un hallazgo para la
retrospectiva posterior, no un cambio de alcance de este ciclo.
