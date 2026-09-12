/**
 * Adaptador de `/api/customers` para la búsqueda del escáner.
 *
 * El backend de la 1.2.0 le cambió la forma: la lista pasó de `customers` a
 * `items` y la meta de sellos de `maxStamps` a `goal`. Las dos ramas avanzan
 * sin esperarse, como pide el contrato FID-C1, así que el consumidor entiende
 * las dos y no hay un día en que la búsqueda deje de encontrar a nadie.
 *
 * ponytail: cuando la 1.2.0 esté integrada y la forma vieja no exista, esto se
 * reduce a leer `items` y `goal`.
 */

export type ClienteBuscado = {
  id: string
  name: string
  stamps: number
  maxStamps: number
  cardName: string
  cardReward: string
  cardBrandColor: string
  cardExpiresAt: string | null
}

type Crudo = Record<string, unknown>

function numero(valor: unknown, porDefecto = 0): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : porDefecto
}

function texto(valor: unknown, porDefecto = ""): string {
  return typeof valor === "string" ? valor : porDefecto
}

function normalizarUno(crudo: Crudo): ClienteBuscado | null {
  const id = texto(crudo.id)
  if (!id) return null
  return {
    id,
    name: texto(crudo.name),
    stamps: numero(crudo.stamps),
    // `goal` es el nombre nuevo; `maxStamps` el que devuelve esta rama hoy.
    maxStamps: numero(crudo.goal ?? crudo.maxStamps),
    cardName: texto(crudo.cardName),
    cardReward: texto(crudo.cardReward),
    cardBrandColor: texto(crudo.cardBrandColor),
    cardExpiresAt: typeof crudo.cardExpiresAt === "string" ? crudo.cardExpiresAt : null,
  }
}

export function normalizarClientes(respuesta: unknown): ClienteBuscado[] {
  if (!respuesta || typeof respuesta !== "object") return []
  const cuerpo = respuesta as Crudo
  const lista = Array.isArray(cuerpo.items)
    ? cuerpo.items
    : Array.isArray(cuerpo.customers)
      ? cuerpo.customers
      : []
  return lista
    .filter((entrada): entrada is Crudo => Boolean(entrada) && typeof entrada === "object")
    .map(normalizarUno)
    .filter((cliente): cliente is ClienteBuscado => cliente !== null)
}
