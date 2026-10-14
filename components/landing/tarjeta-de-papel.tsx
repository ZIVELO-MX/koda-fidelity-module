import { Coffee } from "lucide-react"

/**
 * La tarjeta de cartón, dibujada.
 *
 * La sección que compara con el papel es la que mejor argumenta el producto, y
 * se estaba contando con viñetas. Un cartón gastado al lado de la tarjeta
 * digital convence solo: cuatro cruces contra cuatro palomas, no.
 *
 * Nada de aire de tragedia. El papel se dibuja con cariño, porque es lo que el
 * negocio usa hoy y le funciona; lo que no hace es contarle nada.
 */
export function TarjetaDePapel() {
  return (
    <div
      aria-hidden="true"
      className="relative w-full max-w-[232px] -rotate-2 rounded-lg border border-[#d8cdb4] bg-[#f0e7d2] p-5 shadow-[0_14px_28px_-18px_rgba(60,40,10,.5)]"
    >
      {/* Fibra del cartón */}
      <div
        className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(101deg, transparent 0 3px, rgba(120,95,50,.07) 3px 4px)",
        }}
      />
      <div className="relative">
        <p className="font-[family-name:var(--font-playfair)] text-[15px] italic text-[#5a4a2e]">
          Café Aurora
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#9a8a68]">
          El décimo va por la casa
        </p>

        <div className="mt-5 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={
                i < 6
                  ? "grid aspect-square place-items-center rounded-full border border-[#b39a6a] bg-[#e3d4ae]"
                  : "aspect-square rounded-full border border-dashed border-[#c9bb9c]"
              }
            >
              {/* Seis sellados a mano: el tampón nunca cae centrado ni parejo. */}
              {i < 6 && (
                <Coffee
                  className="h-3.5 w-3.5 text-[#7a5c2a]"
                  style={{
                    transform: `rotate(${[8, -11, 4, -6, 13, -3][i]}deg)`,
                    opacity: [0.9, 0.7, 0.85, 0.6, 0.8, 0.72][i],
                  }}
                  strokeWidth={2.6}
                />
              )}
            </div>
          ))}
        </div>

        <p className="mt-5 text-[10px] text-[#9a8a68]">No pierdas esta tarjeta</p>
      </div>
    </div>
  )
}
