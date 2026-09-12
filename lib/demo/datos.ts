// Datos de ejemplo del modo demo. Solo lectura, nunca se escriben.
// Cubren a propósito los estados difíciles de sembrar a mano: tarjeta por
// vencer, clientes a un sello de completar, clientes que ya completaron, y una
// tarjeta recién creada sin nadie inscrito.

const HOY = new Date()

function hace(horas: number): Date {
  return new Date(HOY.getTime() - horas * 60 * 60 * 1000)
}

function enDias(dias: number): Date {
  return new Date(HOY.getTime() + dias * 24 * 60 * 60 * 1000)
}

export const negocioDemo = {
  id: "demo-negocio",
  name: "Café Aurora",
  nickname: "Aurora",
  email: "hola@cafeaurora.mx",
  brandColor: "#6f4e37",
  logoUrl: null as string | null,
  iconName: "coffee" as string | null,
  stampIconName: "coffee" as string | null,
  businessType: "Cafetería",
  address: null as string | null,
  phone: null as string | null,
  website: null as string | null,
  instagram: null as string | null,
  createdAt: hace(24 * 60),
  updatedAt: hace(24),
}

export const usuarioDemo = {
  id: "demo-usuario",
  email: "raul@cafeaurora.mx",
  name: "Raúl Méndez",
  role: "admin" as "admin" | "sellador",
  businessId: negocioDemo.id,
}

function cliente(nombre: string, sellos: number, alta: number) {
  return {
    id: "demo-cliente-" + nombre.toLowerCase().replace(/\s+/g, "-"),
    name: nombre,
    email: nombre.toLowerCase().replace(/\s+/g, ".") + "@ejemplo.mx",
    stamps: sellos,
    isActive: true,
    createdAt: hace(alta),
    updatedAt: hace(1),
    applePassId: null,
    googlePassId: null,
    _count: { stampsLog: sellos, milestoneClaims: 0 },
  }
}

export const tarjetasDemo = [
  {
    id: "demo-tarjeta-decimo",
    name: "Décimo gratis",
    description: "Junta diez sellos y el siguiente café va por la casa",
    reward: "Un café gratis",
    stampsRequired: 10,
    brandColor: "#6f4e37",
    iconName: "coffee",
    stampIconName: "coffee",
    isActive: true,
    expiresAt: enDias(4), // vence pronto, para ver el aviso de atención
    createdAt: hace(24 * 40),
    updatedAt: hace(3),
    businessId: negocioDemo.id,
    _count: { customers: 5 },
    customers: [
      cliente("Marisol Aguirre", 9, 24 * 30), // a un sello de completar
      cliente("Diego Ramírez", 10, 24 * 25), // listo para canjear
      cliente("Ana López", 6, 24 * 12),
      cliente("Carlos Ruiz", 3, 24 * 5),
      cliente("Sofía Vega", 1, 6),
    ],
  },
  {
    id: "demo-tarjeta-postre",
    name: "Postre de la casa",
    description: null,
    reward: "Un postre gratis",
    stampsRequired: 8,
    brandColor: "#be185d",
    iconName: "cake",
    stampIconName: "cake",
    isActive: true,
    expiresAt: null,
    createdAt: hace(24 * 3),
    updatedAt: hace(24 * 3),
    businessId: negocioDemo.id,
    _count: { customers: 0 }, // recién creada, sin nadie todavía
    customers: [],
  },
]

export const actividadDemo = [
  { id: "demo-log-1", type: "stamp", createdAt: hace(1), customer: { name: "Marisol Aguirre", card: { name: "Décimo gratis" } } },
  { id: "demo-log-2", type: "redeem", createdAt: hace(3), customer: { name: "Diego Ramírez", card: { name: "Décimo gratis" } } },
  { id: "demo-log-3", type: "stamp", createdAt: hace(5), customer: { name: "Ana López", card: { name: "Décimo gratis" } } },
  { id: "demo-log-4", type: "stamp", createdAt: hace(7), customer: { name: "Sofía Vega", card: { name: "Décimo gratis" } } },
  { id: "demo-log-5", type: "stamp", createdAt: hace(26), customer: { name: "Carlos Ruiz", card: { name: "Décimo gratis" } } },
  { id: "demo-log-6", type: "redeem", createdAt: hace(30), customer: { name: "Ana López", card: { name: "Décimo gratis" } } },
  { id: "demo-log-7", type: "stamp", createdAt: hace(31), customer: { name: "Marisol Aguirre", card: { name: "Décimo gratis" } } },
]
