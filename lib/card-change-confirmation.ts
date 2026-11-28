import { createHash } from "node:crypto"
import { CardChangeConfirmationError } from "@/lib/api-utils"

type CardChange = { key: string; message: string }

export function primaryReplacement(current: { id: string; name: string } | null, nextId?: string): CardChange | null {
  return current && current.id !== nextId
    ? { key: `primary:${current.id}:${nextId ?? "new"}`, message: `«${current.name}» quedará bloqueada. Sus clientes conservarán su historial, pero no podrán sellar ni canjear en ella.` }
    : null
}

export function requireCardChangeConfirmation(confirmation: string | null | undefined, ...changes: (CardChange | null)[]) {
  const required = changes.filter(change => change !== null)
  if (!required.length) return
  const token = createHash("sha256").update(JSON.stringify(required)).digest("hex")
  if (confirmation !== token) {
    throw new CardChangeConfirmationError(required.map(change => change.message).join("\n\n"), token)
  }
}
