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

export type ClientesPage = { items: ClienteBuscado[]; page: number; pageSize: number; total: number }
type Crudo = Record<string, unknown>

const number = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback

function one(raw: Crudo): ClienteBuscado {
  const id = text(raw.id)
  if (!id) throw new Error("Invalid customer response: item id is required")
  return {
    id, name: text(raw.name), stamps: number(raw.stamps), maxStamps: number(raw.goal ?? raw.maxStamps),
    cardName: text(raw.cardName), cardReward: text(raw.cardReward), cardBrandColor: text(raw.cardBrandColor),
    cardExpiresAt: typeof raw.cardExpiresAt === "string" ? raw.cardExpiresAt : null,
  }
}

/** Parse the canonical C1 customer payload without hiding contract failures. */
export function parseClientesResponse(response: unknown): ClientesPage {
  if (!response || typeof response !== "object") throw new Error("Invalid customer response")
  const body = response as Crudo
  if (typeof body.error === "string") throw new Error(body.error)
  const rawItems = Array.isArray(body.items) ? body.items : null
  if (!rawItems) throw new Error("Invalid customer response: items is required")
  const items = rawItems.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid customer response: item is required")
    return one(item as Crudo)
  })
  return {
    items,
    page: number(body.page, 1),
    pageSize: number(body.pageSize, items.length),
    total: number(body.total, items.length),
  }
}

export function normalizarClientes(response: unknown): ClienteBuscado[] {
  return parseClientesResponse(response).items
}
