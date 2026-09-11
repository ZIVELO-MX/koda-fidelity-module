import { getCardIcon } from "@/lib/card-icons"

/**
 * Los diseños por giro, del diseño aprobado.
 *
 * Es el marquee que se conserva, porque aquí el movimiento enseña el producto
 * en vez de decorar. **Pausa también al enfocar con teclado**, no solo al pasar
 * el cursor: quien recorre la página con Tab necesita que se detenga igual.
 *
 * Los degradados son los mismos siete del diseño y el patrón de íconos va al
 * 14%, como el resto de tarjetas del producto.
 */
const GIROS = [
  { giro: "Cafetería", negocio: "The Daily Grind", icono: "coffee", de: "#b45309", a: "#7c2d12" },
  { giro: "Taquería", negocio: "El Fogón", icono: "utensils", de: "#ea580c", a: "#9a3412" },
  { giro: "Barbería", negocio: "Clásica", icono: "scissors", de: "#334155", a: "#0f172a" },
  { giro: "Gimnasio", negocio: "Iron Gym", icono: "dumbbell", de: "#0d9488", a: "#042f2c" },
  { giro: "Heladería", negocio: "Nube", icono: "ice-cream-cone", de: "#7c3aed", a: "#4c1d95" },
  { giro: "Pizzería", negocio: "Bella Napoli", icono: "pizza", de: "#dc2626", a: "#7f1d1d" },
  { giro: "Pastelería", negocio: "Dulce Aroma", icono: "cake", de: "#be185d", a: "#831843" },
]

function Tarjeta({ giro }: { giro: (typeof GIROS)[number] }) {
  const Icono = getCardIcon(giro.icono)?.Icon
  return (
    <div
      className="relative aspect-[0.72] w-[232px] shrink-0 overflow-hidden rounded-2xl shadow-[0_20px_40px_-22px_rgba(30,15,0,.4)]"
      style={{ background: `radial-gradient(120% 120% at 20% 5%, ${giro.de}, ${giro.a})` }}
    >
      <div className="relative flex h-full flex-col justify-between p-5">
        {Icono && <Icono className="h-6 w-6 text-white" aria-hidden="true" />}
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] text-white/70">{giro.giro}</p>
          <p className="mt-0.5 text-lg font-bold text-white">{giro.negocio}</p>
        </div>
      </div>
    </div>
  )
}

export function DisenosPorGiro() {
  return (
    <div
      className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]"
      // El grupo permite pausar al enfocar cualquier cosa de dentro, no solo al
      // pasar el cursor por encima.
      tabIndex={-1}
    >
      <div className="flex w-max animate-[marquee-scroll_55s_linear_infinite] gap-5 py-2 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
        {GIROS.map((giro) => (
          <Tarjeta key={giro.giro} giro={giro} />
        ))}
        {GIROS.map((giro) => (
          <div key={`${giro.giro}-eco`} aria-hidden="true" className="contents">
            <Tarjeta giro={giro} />
          </div>
        ))}
      </div>
    </div>
  )
}
