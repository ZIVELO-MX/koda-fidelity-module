/**
 * La cola del autoguardado del alta.
 *
 * Existe por tres defectos que tenía el guardado suelto en el componente, y los
 * tres perdían trabajo de la persona:
 *
 * 1. El `draftVersion` venía del cierre de React. Si escribías mientras un
 *    guardado estaba en vuelo, el siguiente salía con una versión ya vieja y el
 *    servidor lo rechazaba por conflicto.
 * 2. Lo pendiente se vaciaba **antes** de resolver el guardado. Si ese guardado
 *    fallaba, lo que estaba dentro ya no estaba en ningún sitio: se perdía.
 * 3. Avanzar de paso no esperaba al vuelo, así que pedía avanzar con una versión
 *    vieja y el paso fallaba sin que la persona hubiera hecho nada raro.
 *
 * Aquí la versión se lleva de lo que responde el servidor, nunca de un cierre;
 * hay un solo guardado a la vez y lo que llega durante el vuelo se encola; y si
 * un guardado falla, sus cambios **vuelven a la cola** en vez de desaparecer.
 */

/**
 * Lo mínimo que la cola necesita saber de los cambios: que `business` y `card`
 * son objetos fusionables. El tipo concreto lo pone quien la usa, para no
 * mantener aquí una copia del contrato que pueda quedarse vieja.
 */
export type CambiosFusionables = {
  business?: Record<string, unknown>
  card?: Record<string, unknown>
}

/**
 * Fusiona dos tandas de cambios. `business` y `card` se mezclan campo por campo:
 * quien escribe el nombre y luego la categoría espera que viajen los dos, no que
 * el segundo borre al primero.
 */
export function fusionarCambios<C extends CambiosFusionables>(previos: C | null, nuevos: C): C {
  const fusion = { ...(previos ?? {}), ...nuevos } as C
  if (previos?.business || nuevos.business) {
    fusion.business = { ...(previos?.business ?? {}), ...(nuevos.business ?? {}) }
  }
  if (previos?.card || nuevos.card) {
    fusion.card = { ...(previos?.card ?? {}), ...(nuevos.card ?? {}) }
  }
  return fusion
}

export type ColaDeBorrador<E, C extends CambiosFusionables> = {
  /** Encola cambios y devuelve la promesa del vaciado en curso. */
  encolar: (cambios: C) => Promise<void>
  /** Espera a que no quede nada por guardar. Lo usa el avance de paso. */
  vaciar: () => Promise<void>
  /** La versión más fresca que confirmó el servidor. */
  version: () => number
  /** Si hay algo esperando o en vuelo. */
  ocupada: () => boolean
  /**
   * Fija la versión desde fuera. Avanzar de paso también la sube en el
   * servidor, y si la cola no se entera el siguiente guardado sale con una
   * versión vieja: el mismo conflicto que esto vino a arreglar.
   */
  sembrar: (version: number) => void
}

export function crearColaDeBorrador<E, C extends CambiosFusionables>(opciones: {
  versionInicial: number
  guardar: (version: number, cambios: C) => Promise<E>
  versionDe: (estado: E) => number
  alGuardar: (estado: E) => void
  alFallar: (error: unknown) => void
}): ColaDeBorrador<E, C> {
  let version = opciones.versionInicial
  let pendiente: C | null = null
  let corriendo: Promise<void> | null = null

  async function correr() {
    while (pendiente) {
      const enVuelo = pendiente
      pendiente = null
      try {
        const estado = await opciones.guardar(version, enVuelo)
        version = opciones.versionDe(estado)
        opciones.alGuardar(estado)
      } catch (error) {
        // Lo que no se guardó vuelve a la cola, debajo de lo que llegó después,
        // para que un reintento lo recupere en vez de perderlo.
        pendiente = fusionarCambios(enVuelo, (pendiente ?? {}) as C)
        opciones.alFallar(error)
        return
      }
    }
  }

  function arrancar() {
    if (!corriendo) {
      corriendo = correr().finally(() => {
        corriendo = null
      })
    }
    return corriendo
  }

  return {
    encolar(cambios) {
      pendiente = fusionarCambios(pendiente, cambios)
      return arrancar()
    },
    vaciar() {
      // Puede quedar algo encolado por un fallo anterior: se intenta de nuevo.
      return pendiente ? arrancar() : (corriendo ?? Promise.resolve())
    },
    version: () => version,
    ocupada: () => Boolean(pendiente) || Boolean(corriendo),
    sembrar(nueva) {
      version = nueva
    },
  }
}
