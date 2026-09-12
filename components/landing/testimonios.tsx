/**
 * Testimonios.
 *
 * La decisión del ciclo es doble y aquí se cumplen las dos: la sección se
 * diseña, y no se publica con datos de muestra. Un testimonio inventado en la
 * landing de un producto que cobra es el peor negocio posible.
 *
 * Así que el diseño existe y está probado, pero `TESTIMONIOS` está vacío y el
 * componente no pinta nada. El día que haya citas reales aprobadas se pegan
 * ahí y la sección aparece. Mientras tanto no hay hueco, ni encabezado, ni
 * promesa.
 *
 * Sin estrellas: nadie nos las dio, así que no las dibujamos.
 */

export type Testimonio = {
  /** Tres líneas como máximo. */
  cita: string
  nombre: string
  rol: string
  negocio: string
}

/**
 * EJEMPLO. No se renderiza nunca. Existe para que el diseño se pueda ver y
 * probar sin inventar personas en la página de verdad.
 */
export const TESTIMONIOS_DE_EJEMPLO: Testimonio[] = [
  {
    cita: "Antes anotaba las visitas en una libreta y se me perdían. Ahora sé quién vuelve cada semana.",
    nombre: "Nombre de ejemplo",
    rol: "Dueña",
    negocio: "Negocio de ejemplo",
  },
  {
    cita: "Lo puse un martes y el jueves ya tenía cuarenta personas con su tarjeta en el teléfono.",
    nombre: "Nombre de ejemplo",
    rol: "Encargado",
    negocio: "Negocio de ejemplo",
  },
]

/** Citas reales y aprobadas. Vacío hasta que las haya. */
export const TESTIMONIOS: Testimonio[] = []

export function Testimonios({ testimonios = TESTIMONIOS }: { testimonios?: Testimonio[] }) {
  if (testimonios.length === 0) return null

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground sm:text-4xl">
          Lo que dicen los negocios
        </h2>
        <div className="grid gap-8 sm:grid-cols-2">
          {testimonios.map((testimonio) => (
            <figure key={`${testimonio.nombre}-${testimonio.negocio}`} className="border-t border-border pt-6">
              <blockquote className="text-lg leading-relaxed text-foreground">
                {testimonio.cita}
              </blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{testimonio.nombre}</span>
                {", "}
                {testimonio.rol} de {testimonio.negocio}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
