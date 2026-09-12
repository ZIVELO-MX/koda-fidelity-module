import { Globe } from "lucide-react"
import { redesDelNegocio } from "@/lib/redes-negocio"

/** lucide retiró los íconos de marca, así que este va dibujado aquí. */
function IconoInstagram({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

const ICONOS = { website: Globe, instagram: IconoInstagram } as const

/**
 * Los enlaces del negocio, junto a la tarjeta que ve su cliente. Si el negocio
 * no los tiene, o la API todavía no los manda, no se pinta nada: no hay hueco
 * ni promesa. Ver lib/redes-negocio.ts.
 */
export function RedesNegocio({
  negocio,
  className,
}: {
  negocio: { website?: string | null; instagram?: string | null } | null | undefined
  className?: string
}) {
  const redes = redesDelNegocio(negocio)
  if (redes.length === 0) return null

  return (
    <div className={className}>
      <ul className="flex items-center justify-center gap-2">
        {redes.map((red) => {
          const Icono = ICONOS[red.clave]
          return (
            <li key={red.clave}>
              <a
                href={red.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={red.etiqueta}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icono className="h-5 w-5" aria-hidden="true" />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
