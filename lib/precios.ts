/**
 * La cuenta del plan anual.
 *
 * Los dos números son reales y comprobables: el tachado es lo que la persona
 * pagaría de verdad eligiendo mensual, no un "antes" inventado. Un precio de
 * referencia que nunca se cobró es publicidad engañosa.
 */
export function cuentaDelAnual(mensual: number, anual: number) {
  const doceMeses = mensual * 12
  return {
    /** Lo que costaría el año pagando mes a mes. */
    doceMeses,
    /** Lo que se ahorra pagando de golpe. */
    ahorro: doceMeses - anual,
    /** Lo que sale el mes pagando por año. */
    porMes: Math.round(anual / 12),
  }
}
