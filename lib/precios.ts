/**
 * La cuenta del plan anual.
 *
 * Los números son reales y comprobables. El del año pagando mes a mes no es un
 * "antes": es lo que costaría la otra modalidad, que sigue disponible. Por eso
 * no se tacha en ningún sitio -- un tachado se lee como precio anterior, y un
 * precio de referencia que nunca se cobró es publicidad engañosa.
 *
 * El equivalente mensual no se redondea hacia abajo. 1490 entre doce da 124.17,
 * y escribir 124 vende el plan por dos pesos menos al mes de lo que cuesta.
 */
export function cuentaDelAnual(mensual: number, anual: number) {
  const doceMeses = mensual * 12
  const ahorro = doceMeses - anual
  return {
    /** Lo que costaría el año pagando mes a mes. La otra opción, no un "antes". */
    doceMeses,
    /** Lo que se ahorra pagando de golpe. */
    ahorro,
    /** Lo que sale el mes pagando por año, exacto y sin redondear. */
    porMes: anual / 12,
    /**
     * Cuántas mensualidades cubre el ahorro. Sale de los importes, así que la
     * promesa no puede quedarse vieja si cambia un precio.
     */
    mesesGratis: mensual > 0 ? ahorro / mensual : 0,
  }
}

const ENTERO = new Intl.NumberFormat("es-MX")
const CON_CENTAVOS = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Centavos solo cuando los hay: $1,490 y $124.17, nunca $1,490.00. */
export function pesos(importe: number) {
  return Number.isInteger(importe) ? ENTERO.format(importe) : CON_CENTAVOS.format(importe)
}

/**
 * La promesa de meses gratis, solo si cuadra exacta. Con un ahorro que no da
 * un número entero de mensualidades no se dice "dos meses gratis": se calla,
 * porque el ahorro en pesos ya está escrito al lado y ese sí es exacto.
 */
export function mesesGratisExactos(mensual: number, anual: number): number | null {
  const { mesesGratis } = cuentaDelAnual(mensual, anual)
  return Number.isInteger(mesesGratis) && mesesGratis > 0 ? mesesGratis : null
}
