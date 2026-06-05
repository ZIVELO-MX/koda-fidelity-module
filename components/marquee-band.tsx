const businesses = [
  "Cafeterías",
  "Restaurantes",
  "Barberías",
  "Panaderías",
  "Spas",
  "Pizzerías",
  "Heladerías",
  "Taquerías",
  "Salones de Belleza",
  "Peluquerías",
  "Veterinarias",
  "Pastelerías",
  "Gimnasios",
  "Tiendas de Ropa",
]

function MarqueeContent() {
  return (
    <>
      {businesses.map((name) => (
        <span key={name} className="inline-flex items-center shrink-0">
          <span className="marquee-text">{name}</span>
          <span className="marquee-sep mx-10" aria-hidden="true">—</span>
        </span>
      ))}
    </>
  )
}

export function MarqueeBand() {
  return (
    <div aria-hidden="true" className="marquee-band border-y flex items-center">

      {/* Label fijo */}
      <div className="marquee-label shrink-0 flex items-center gap-0 pl-6 pr-5 border-r border-white/10 self-stretch">
        <p className="whitespace-nowrap">
          <span className="marquee-label-pre max-sm:hidden">Te recomendamos </span>
          <span className="marquee-label-brand">Koda Fidelity</span>
          <span className="marquee-label-pre max-sm:hidden"> si eres:</span>
        </p>
      </div>

      {/* Fade + scroll */}
      <div className="relative flex-1 overflow-hidden">
        <div className="marquee-fade-left pointer-events-none absolute inset-y-0 left-0 w-12 z-10" />
        <div className="marquee-track">
          <MarqueeContent />
          <MarqueeContent />
        </div>
        <div className="marquee-fade-right pointer-events-none absolute inset-y-0 right-0 w-12 z-10" />
      </div>

    </div>
  )
}
