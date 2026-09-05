// Los negocios de Fidelity son de México. Si el día se cortara en UTC, las
// cifras de hoy se reiniciarían a las seis de la tarde, en plena hora pico.
//
// ponytail: la zona es fija. Cuando Business tenga la suya, se recibe como
// argumento, que ya está previsto en la firma.
const ZONA = "America/Mexico_City"

/** Instante en el que empezó el día local de `referencia`. */
export function inicioDelDia(referencia: Date = new Date(), zona: string = ZONA): Date {
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referencia)

  const desplazamiento =
    new Intl.DateTimeFormat("en-US", { timeZone: zona, timeZoneName: "longOffset" })
      .format(referencia)
      .match(/GMT([+-]\d{2}:\d{2})/)?.[1] ?? "+00:00"

  return new Date(`${fecha}T00:00:00${desplazamiento}`)
}

/** Instante en el que empezó el día local anterior al de `referencia`. */
export function inicioDelDiaAnterior(referencia: Date = new Date(), zona: string = ZONA): Date {
  // Se retrocede medio día desde la medianoche local para caer a mediodía de
  // ayer. Así un cambio de horario no deja el cálculo en el día equivocado.
  const hoy = inicioDelDia(referencia, zona)
  return inicioDelDia(new Date(hoy.getTime() - 12 * 60 * 60 * 1000), zona)
}
