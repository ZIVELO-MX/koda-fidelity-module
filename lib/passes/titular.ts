import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { NotFoundError, UnauthorizedError, ValidationError } from "@/lib/api-utils"
import { normalizeEmail } from "@/lib/auth-security"

/**
 * El cliente de `cardId` cuyo pase pide la sesión. El pase lleva su nombre y su
 * avance, y su QR es lo que el negocio escanea para sellar: antes bastaba
 * conocer `cardId` y `customerId`, sin sesión. Se exige el mismo correo
 * confirmado que en `/api/join`, y otro correo recibe 404 para no confirmar que
 * el cliente existe.
 */
export async function clienteTitular(cardId: string, customerId: unknown) {
  if (typeof customerId !== "string" || !customerId) throw new ValidationError("customerId is required")
  const { data: { user }, error } = await (await createClient()).auth.getUser()
  if (error || !user?.email || !user.email_confirmed_at) throw new UnauthorizedError()
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer || customer.cardId !== cardId || normalizeEmail(customer.email ?? "") !== normalizeEmail(user.email)) {
    throw new NotFoundError("Customer not found")
  }
  return customer
}
