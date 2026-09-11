import type { LucideIcon } from "lucide-react"

/**
 * El patrón de íconos que convierte un degradado en un tema.
 *
 * Sin él las tarjetas del carrusel se ven como colores sólidos, que es
 * justo lo que el diseño aprobado evita: el patrón es lo que hace que una
 * cafetería se vea de cafetería.
 *
 * Se repite en mosaicos de 150px con seis íconos por mosaico, en las
 * posiciones, tamaños y giros del diseño. El grosor del trazo se corrige por
 * escala para que un ícono de 16px no se vea más gordo que uno de 30.
 */
const POSICIONES = [
  { x: 34, y: 30, tamano: 30, giro: -14 },
  { x: 104, y: 52, tamano: 22, giro: 20 },
  { x: 60, y: 96, tamano: 26, giro: 10 },
  { x: 118, y: 112, tamano: 18, giro: -26 },
  { x: 22, y: 120, tamano: 16, giro: 34 },
  { x: 126, y: 22, tamano: 16, giro: 6 },
]

const LADO = 150

/** El diseño dibuja a 1.7 sobre un viewBox de 24. */
function grosor(tamano: number): number {
  return (1.7 * 24) / tamano
}

export function PatronDeIconos({
  iconos,
  opacidad = 0.14,
  color = "#ffffff",
  mosaicos = 12,
}: {
  iconos: LucideIcon[]
  opacidad?: number
  color?: string
  mosaicos?: number
}) {
  if (iconos.length === 0) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: opacidad, color }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, ${LADO}px)`,
          gridAutoRows: `${LADO}px`,
        }}
      >
        {Array.from({ length: mosaicos }).map((_, mosaico) => (
          <div key={mosaico} className="relative">
            {POSICIONES.map((posicion, i) => {
              const Icono = iconos[i % iconos.length]
              return (
                <Icono
                  key={i}
                  strokeWidth={grosor(posicion.tamano)}
                  style={{
                    position: "absolute",
                    left: posicion.x,
                    top: posicion.y,
                    width: posicion.tamano,
                    height: posicion.tamano,
                    transform: `translate(-50%, -50%) rotate(${posicion.giro}deg)`,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
