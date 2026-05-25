import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { getBusinessFromSession, handleApiError, ValidationError, NotFoundError, UnauthorizedError } from "@/lib/api-utils"

/**
 * @openapi
 * /api/join:
 *   post:
 *     tags:
 *       - Membresía
 *     summary: Unirse a una tarjeta de lealtad
 *     description: Registra un nuevo cliente en una tarjeta de lealtad. Si ya existe el email en la tarjeta, retorna el cliente existente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - cardId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del cliente
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del cliente
 *               cardId:
 *                 type: string
 *                 description: ID de la tarjeta de lealtad
 *     responses:
 *       200:
 *         description: Cliente ya existente o creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customerId:
 *                   type: string
 *                 existing:
 *                   type: boolean
 *                   description: true si ya existía, false si es nuevo
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tarjeta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     tags:
 *       - Membresía
 *     summary: Buscar cliente por ID o email
 *     description: |
 *       Busca un cliente por su ID (público) o por email (requiere auth).
 *       - ?id=xxx → búsqueda pública por ID
 *       - ?email=xxx → requiere sesión, retorna todos los customers con ese email
 *       - ?email=xxx&cardId=xxx → filtra también por tarjeta
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID del cliente
 *       - in: query
 *         name: email
 *         required: false
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del cliente (requiere auth)
 *       - in: query
 *         name: cardId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de la tarjeta (filtro adicional con email)
 *     responses:
 *       200:
 *         description: Cliente(s) encontrado(s)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customer:
 *                   $ref: '#/components/schemas/Customer'
 *                 customers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Faltan parámetros
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado (para búsqueda por email)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

const cardInclude = {
  card: {
    select: {
      name: true,
      stampsRequired: true,
      reward: true,
      brandColor: true,
      business: { select: { name: true, brandColor: true, logoUrl: true } },
    },
  },
} as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, cardId } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ValidationError("El nombre es obligatorio")
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Email inválido")
    }
    if (!cardId || typeof cardId !== "string") {
      throw new ValidationError("ID de tarjeta inválido")
    }

    const card = await prisma.loyaltyCard.findUnique({ where: { id: cardId } })
    if (!card) {
      throw new NotFoundError("Tarjeta no encontrada")
    }

    const existing = await prisma.customer.findFirst({
      where: { email, cardId },
    })
    if (existing) {
      return NextResponse.json({ customerId: existing.id, existing: true })
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email,
        cardId,
      },
    })

    return NextResponse.json({ customerId: customer.id, existing: false })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const email = searchParams.get("email")
    const cardId = searchParams.get("cardId")

    if (id) {
      const business = await getBusinessFromSession()

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: cardInclude,
      })
      if (!customer) throw new NotFoundError("Cliente no encontrado")

      const card = await prisma.loyaltyCard.findUnique({
        where: { id: customer.cardId },
        select: { businessId: true },
      })
      if (!card || card.businessId !== business.id) {
        throw new NotFoundError("Cliente no encontrado")
      }

      return NextResponse.json({ customer })
    }

    if (email) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email || user.email !== email) {
        throw new UnauthorizedError()
      }

      const where: Record<string, unknown> = { email }
      if (cardId) where.cardId = cardId

      const customers = await prisma.customer.findMany({
        where,
        include: cardInclude,
        orderBy: { createdAt: "desc" },
      })

      if (customers.length === 0) throw new NotFoundError("Cliente no encontrado")
      return NextResponse.json({ customers })
    }

    throw new ValidationError("Proporciona ?id= o ?email=")
  } catch (error) {
    return handleApiError(error)
  }
}
