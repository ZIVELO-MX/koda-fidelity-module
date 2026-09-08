// Lo que hay que decidir antes de publicar una tarjeta, fuera del JSX del
// formulario, que es donde vivía enredado y sin pruebas. Lo consumen igual la
// creación y la edición, así que las dos validan lo mismo.

export type Sorpresa = {
  stampNumber: number
  label: string
  iconName: string | null
  probability: number
}

export type Borrador = {
  nombre: string
  recompensa: string
  sellosRequeridos: number
  sorpresas: Sorpresa[]
}

export type Validacion = {
  errores: Record<string, string>
  /** Campo al que mover el foco, o null si no hay nada que corregir. */
  primerCampo: string | null
}

/**
 * Las sorpresas que de verdad se mandan al servidor. Una fila sin etiqueta es
 * una fila que quien la abrió no llegó a llenar, y no tiene nada que hacer en
 * la tarjeta publicada.
 */
export function sorpresasQueViajan(sorpresas: Sorpresa[]): Sorpresa[] {
  return sorpresas
    .filter((s) => s.label.trim() !== "")
    .map((s) => ({ ...s, label: s.label.trim() }))
}

export function validarBorrador(borrador: Borrador): Validacion {
  const errores: Record<string, string> = {}
  // El orden importa: es el orden en que se recorre la pantalla, y de él sale
  // el campo que recibe el foco.
  const orden: string[] = []

  const registrar = (campo: string, mensaje: string) => {
    if (errores[campo]) return
    errores[campo] = mensaje
    orden.push(campo)
  }

  if (!borrador.nombre.trim()) registrar("nombre", "Ponle un nombre a la tarjeta")
  if (!borrador.recompensa.trim()) registrar("recompensa", "Di qué se lleva el cliente")
  if (borrador.sellosRequeridos < 1) {
    registrar("sellosRequeridos", "La tarjeta necesita al menos un sello")
  }

  // Solo se validan las sorpresas que van a viajar. Una fila vacía se descarta
  // sola y no tiene por qué frenar la publicación.
  const ocupados = new Map<number, number>()
  borrador.sorpresas.forEach((sorpresa, i) => {
    if (sorpresa.label.trim() === "") return
    const campo = `sorpresa-${i}`

    if (sorpresa.stampNumber < 1 || sorpresa.stampNumber > borrador.sellosRequeridos) {
      registrar(campo, `El sello debe estar entre 1 y ${borrador.sellosRequeridos}`)
      return
    }
    if (ocupados.has(sorpresa.stampNumber)) {
      registrar(campo, "Ya hay otra sorpresa en el mismo sello")
      return
    }
    ocupados.set(sorpresa.stampNumber, i)
  })

  return { errores, primerCampo: orden[0] ?? null }
}
