const ZONA = "America/Mexico_City"
const MILISEGUNDOS_POR_DIA = 86_400_000

function calendario(zona: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

/** Fecha local de referencia, como AAAA-MM-DD. */
export function fechaLocal(referencia: Date = new Date(), zona: string = ZONA): string {
  return calendario(zona).format(referencia)
}

/** Suma días civiles a una fecha de calendario AAAA-MM-DD. */
export function desplazarFechaLocal(fecha: string, dias: number): string {
  return new Date(Date.parse(fecha) + dias * MILISEGUNDOS_POR_DIA).toISOString().slice(0, 10)
}

export function inicioDelDia(referencia: Date = new Date(), zona: string = ZONA, diasAntes = 0): Date {
  const formato = calendario(zona)
  const fecha = desplazarFechaLocal(formato.format(referencia), -diasAntes)
  const centro = Date.parse(fecha)

  // Buscar el primer instante de la fecha local da el desplazamiento de
  // medianoche, incluso cuando la referencia ya tiene otro horario.
  let anterior = centro - MILISEGUNDOS_POR_DIA
  let posterior = centro + MILISEGUNDOS_POR_DIA
  while (posterior - anterior > 1) {
    const medio = Math.floor((anterior + posterior) / 2)
    if (formato.format(medio) < fecha) anterior = medio
    else posterior = medio
  }
  return new Date(posterior)
}

export function inicioDelDiaAnterior(referencia: Date = new Date(), zona: string = ZONA): Date {
  return inicioDelDia(referencia, zona, 1)
}
