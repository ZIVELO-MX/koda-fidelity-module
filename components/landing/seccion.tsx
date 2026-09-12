import type { LucideIcon } from "lucide-react"

/**
 * El ritmo de sección del diseño aprobado: una etiqueta pequeña en píldora,
 * el titular con su acento en cursiva y, si hace falta, una bajada.
 *
 * Antes cada sección era titular centrado, bajada centrada y rejilla, cinco
 * veces seguidas. Eso es lo que hacía que la página pareciera diapositivas.
 * La etiqueta da entrada, el acento rompe la tipografía y las superficies
 * alternan.
 */
export function Etiqueta({ icono: Icono, children }: { icono: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.09em] text-primary">
      <Icono className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Encabezado({
  icono,
  etiqueta,
  children,
  bajada,
  alineado = "centro",
}: {
  icono: LucideIcon
  etiqueta: string
  children: React.ReactNode
  bajada?: string
  alineado?: "centro" | "izquierda"
}) {
  const centrado = alineado === "centro"
  return (
    <div className={centrado ? "mx-auto mb-12 max-w-2xl text-center" : "max-w-xl"}>
      <Etiqueta icono={icono}>{etiqueta}</Etiqueta>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {children}
      </h2>
      {bajada && <p className="mt-3 text-lg text-muted-foreground">{bajada}</p>}
    </div>
  )
}

/** Acento en cursiva. Es el gesto que el diseño repite en cada titular. */
export function Acento({ children }: { children: React.ReactNode }) {
  return <span className="landing-acento text-primary">{children}</span>
}
