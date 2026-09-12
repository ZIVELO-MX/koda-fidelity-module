import { Check, Coffee, X } from "lucide-react"
import { PatronDeIconos } from "@/components/patron-de-iconos"
import { TarjetaDePapel } from "./tarjeta-de-papel"

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

/** La misma tarjeta, en digital. Sin QR ni pie: aquí solo se compara la cara. */
function TarjetaDigital() {
  return (
    <div
      aria-hidden="true"
      className="relative w-full max-w-[232px] overflow-hidden rounded-2xl shadow-[0_18px_36px_-20px_rgba(30,15,0,.7)]"
      style={{ background: "radial-gradient(120% 120% at 20% 5%, #b45309, #7c2d12)" }}
    >
      <PatronDeIconos iconos={[Coffee]} opacidad={0.14} columnas={2} filas={3} />
      <div className="relative p-5">
        <p className="text-[15px] font-bold text-white">Café Aurora</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/65">
          El décimo va por la casa
        </p>
        <div className="mt-5 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={
                i < 6
                  ? "grid aspect-square place-items-center rounded-lg bg-white"
                  : "aspect-square rounded-lg border border-dashed border-white/40"
              }
            >
              {i < 6 && <Coffee className="h-3.5 w-3.5 text-[#7c2d12]" strokeWidth={2.4} />}
            </div>
          ))}
        </div>
        <p className="mt-5 text-[10px] text-white/65">Siempre en su teléfono</p>
      </div>
    </div>
  )
}

export function ComparacionPapel() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-foreground">Tarjeta de papel</h3>
        <div className="mt-6 flex justify-center">
          <TarjetaDePapel />
        </div>
        <ul className="mt-8 space-y-4">
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
        <div className="mt-6 flex justify-center">
          <TarjetaDigital />
        </div>
        <ul className="mt-8 space-y-4">
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
