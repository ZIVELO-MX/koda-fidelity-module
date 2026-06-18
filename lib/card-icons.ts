import { Coffee, Utensils, ShoppingBag, Star, Crown, Stamp, type LucideIcon } from "lucide-react"

export interface CardIcon {
  name: string
  label: string
  Icon: LucideIcon
}

export const CARD_ICONS: CardIcon[] = [
  { name: "coffee", label: "Café", Icon: Coffee },
  { name: "utensils", label: "Restaurante", Icon: Utensils },
  { name: "shopping-bag", label: "Tienda", Icon: ShoppingBag },
  { name: "star", label: "General", Icon: Star },
  { name: "crown", label: "Premium", Icon: Crown },
  { name: "stamp", label: "Sello", Icon: Stamp },
]

export function getCardIcon(name: string | null | undefined): CardIcon | undefined {
  if (!name) return undefined
  return CARD_ICONS.find((i) => i.name === name)
}
