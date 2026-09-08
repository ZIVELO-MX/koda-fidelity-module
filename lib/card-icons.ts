import {
  Bone,
  Cake,
  Candy,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  Cross,
  Crown,
  CupSoda,
  Droplet,
  Dumbbell,
  Fish,
  Flag,
  Flame,
  Flower2,
  Gift,
  Heart,
  IceCreamBowl,
  IceCreamCone,
  Leaf,
  Medal,
  Milk,
  Paintbrush,
  PawPrint,
  Pill,
  Pizza,
  Sandwich,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stamp,
  Star,
  Stethoscope,
  Syringe,
  Target,
  Thermometer,
  Timer,
  Trophy,
  Utensils,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react"

export interface CardIcon {
  name: string
  label: string
  /** Rubro con el que se agrupa en el selector. */
  grupo: string
  Icon: LucideIcon
}

// Los rubros y sus íconos salen del catálogo de temas de tarjeta que definió
// FID-0009, en `docs/design/prototipo-alta.html`, para que el ícono que eliges y
// el tema de la tarjeta hablen el mismo idioma. Todos son de lucide, que ya
// estaba instalado: ninguna dependencia nueva.
//
// CUIDADO: `name` es lo que se guarda en la base. Los primeros son los que
// existían antes y no se renombran ni se quitan, o las tarjetas ya publicadas se
// quedarían sin su ícono.
export const CARD_ICONS: CardIcon[] = [
  { name: "star", label: "General", grupo: "General", Icon: Star },
  { name: "stamp", label: "Sello", grupo: "General", Icon: Stamp },
  { name: "gift", label: "Regalo", grupo: "General", Icon: Gift },
  { name: "crown", label: "Premium", grupo: "General", Icon: Crown },
  { name: "utensils", label: "Restaurante", grupo: "General", Icon: Utensils },
  { name: "shopping-bag", label: "Tienda", grupo: "General", Icon: ShoppingBag },
  { name: "sparkles", label: "Brillos", grupo: "General", Icon: Sparkles },
  { name: "heart", label: "Corazón", grupo: "General", Icon: Heart },

  { name: "croissant", label: "Cuernito", grupo: "Panadería", Icon: Croissant },
  { name: "wheat", label: "Trigo", grupo: "Panadería", Icon: Wheat },
  { name: "cookie", label: "Galleta", grupo: "Panadería", Icon: Cookie },
  { name: "cake", label: "Pastel", grupo: "Panadería", Icon: Cake },

  { name: "flame", label: "Fuego", grupo: "Taquería", Icon: Flame },
  { name: "citrus", label: "Limón", grupo: "Taquería", Icon: Citrus },
  { name: "leaf", label: "Cilantro", grupo: "Taquería", Icon: Leaf },

  { name: "coffee", label: "Café", grupo: "Cafetería", Icon: Coffee },
  { name: "milk", label: "Leche", grupo: "Cafetería", Icon: Milk },

  { name: "sandwich", label: "Hamburguesa", grupo: "Hamburguesas", Icon: Sandwich },
  { name: "cup-soda", label: "Refresco", grupo: "Hamburguesas", Icon: CupSoda },
  { name: "utensils-crossed", label: "Cubiertos", grupo: "Hamburguesas", Icon: UtensilsCrossed },

  { name: "pizza", label: "Pizza", grupo: "Pizzería", Icon: Pizza },

  { name: "scissors", label: "Tijeras", grupo: "Barbería", Icon: Scissors },
  { name: "paintbrush", label: "Brocha", grupo: "Barbería", Icon: Paintbrush },

  { name: "flower-2", label: "Flor", grupo: "Belleza", Icon: Flower2 },
  { name: "droplet", label: "Gota", grupo: "Belleza", Icon: Droplet },

  { name: "dumbbell", label: "Pesa", grupo: "Gimnasio", Icon: Dumbbell },
  { name: "timer", label: "Cronómetro", grupo: "Gimnasio", Icon: Timer },

  { name: "trophy", label: "Trofeo", grupo: "Deporte", Icon: Trophy },
  { name: "target", label: "Diana", grupo: "Deporte", Icon: Target },
  { name: "medal", label: "Medalla", grupo: "Deporte", Icon: Medal },
  { name: "flag", label: "Bandera", grupo: "Deporte", Icon: Flag },

  { name: "fish", label: "Pescado", grupo: "Sushi", Icon: Fish },

  { name: "paw-print", label: "Huella", grupo: "Veterinaria", Icon: PawPrint },
  { name: "bone", label: "Hueso", grupo: "Veterinaria", Icon: Bone },
  { name: "stethoscope", label: "Estetoscopio", grupo: "Veterinaria", Icon: Stethoscope },

  { name: "pill", label: "Pastilla", grupo: "Farmacia", Icon: Pill },
  { name: "cross", label: "Cruz", grupo: "Farmacia", Icon: Cross },
  { name: "syringe", label: "Jeringa", grupo: "Farmacia", Icon: Syringe },
  { name: "thermometer", label: "Termómetro", grupo: "Farmacia", Icon: Thermometer },

  { name: "ice-cream-cone", label: "Cono", grupo: "Heladería", Icon: IceCreamCone },
  { name: "ice-cream-bowl", label: "Copa", grupo: "Heladería", Icon: IceCreamBowl },
  { name: "cherry", label: "Cereza", grupo: "Heladería", Icon: Cherry },
  { name: "candy", label: "Dulce", grupo: "Heladería", Icon: Candy },
]

/** Los rubros en el orden en que se muestran, sin repetir. */
export const GRUPOS_DE_ICONOS: string[] = [...new Set(CARD_ICONS.map((i) => i.grupo))]

export function getCardIcon(name: string | null | undefined): CardIcon | undefined {
  if (!name) return undefined
  return CARD_ICONS.find((i) => i.name === name)
}
