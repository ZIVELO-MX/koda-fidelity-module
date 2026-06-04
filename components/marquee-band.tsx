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
        <span key={name} className="inline-flex items-center gap-[48px] shrink-0">
          <span className="marquee-text">{name}</span>
          <span className="marquee-sep" aria-hidden="true">—</span>
        </span>
      ))}
    </>
  )
}

export function MarqueeBand() {
  return (
    <div
      aria-hidden="true"
      className="marquee-band overflow-hidden border-y"
    >
      <div className="marquee-track">
        <MarqueeContent />
        <MarqueeContent />
      </div>
    </div>
  )
}
