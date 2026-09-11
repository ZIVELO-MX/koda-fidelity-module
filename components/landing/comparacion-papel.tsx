import { Check, X } from "lucide-react"

/**
 * La sección que mejor argumenta el producto: dos columnas, el papel y Koda.
 *
 * Las cruces no van en rojo. El papel no es un error ni un peligro, es la
 * alternativa que el negocio usa hoy. Rojo aquí es alarmismo y además gasta un
 * color que hace falta para estados de verdad.
 *
 * El panel oscuro usa la tinta del ADN sobre su fondo claro, que da de sobra
 * para AA en texto normal.
 */
const FILAS = [
  {
    papel: "Se queda en casa, o se pierde en la cartera",
    koda: "Vive en su teléfono, siempre encima",
  },
  {
    papel: "No sabes quién vuelve ni cada cuánto",
    koda: "Ves quién vuelve, cuándo y con cuántos sellos",
  },
  {
    papel: "Un sello de más y nadie se entera",
    koda: "Cada sello y cada canje quedan registrados",
  },
  {
    papel: "Reimprimir cuesta cada vez que cambias algo",
    koda: "Cambias el diseño y la tarjeta de todos cambia",
  },
]

export function ComparacionPapel() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-foreground">Tarjeta de papel</h3>
        <ul className="mt-6 space-y-4">
          {FILAS.map((fila) => (
            <li key={fila.papel} className="flex items-start gap-3">
              <X
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-sm text-muted-foreground">{fila.papel}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-[#1C1B17] p-6 text-[#FAFAF7] sm:p-8">
        <h3 className="text-lg font-semibold">Koda Fidelity</h3>
        <ul className="mt-6 space-y-4">
          {FILAS.map((fila) => (
            <li key={fila.koda} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm text-[#FAFAF7]/85">{fila.koda}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
