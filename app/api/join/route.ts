import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { getBusinessFromSession, handleApiError, ValidationError, NotFoundError, UnauthorizedError } from "@/lib/api-utils"

/**
 * @openapi
 * /api/join:
 *   post:
 *     tags:
 *       - Membership
 *     summary: Join a loyalty card
 *     description: Registers a customer for a loyalty card. Returns the existing customer when the email is already registered for that card.
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
 *                 description: Customer name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email
 *               cardId:
 *                 type: string
 *                 description: Loyalty card ID
 *     responses:
 *       200:
 *         description: Existing or created customer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customerId:
 *                   type: string
 *                   description: Only present when existing is false (new customer)
 *                 existing:
 *                   type: boolean
 *                   description: true when already registered (customerId omitted), false when newly created
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Card not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     tags:
 *       - Membership
 *     summary: Find customer by ID or email
 *     description: |
 *       Finds a customer by ID or email.
 *       - ?id=xxx requires an authenticated business session
 *       - ?email=xxx requires the matching authenticated customer and returns all cards for that email
 *       - ?email=xxx&cardId=xxx also filters by card
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: Customer ID
 *       - in: query
 *         name: email
 *         required: false
 *         schema:
 *           type: string
 *           format: email
 *         description: Customer email (requires authentication)
 *       - in: query
 *         name: cardId
 *         required: false
 *         schema:
 *           type: string
 *         description: Card ID (optional filter used with email)
 *     responses:
 *       200:
 *         description: Found customer or customers
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
 *         description: Missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized for email lookup
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Customer not found
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
      iconName: true,
      expiresAt: true,
      business: { select: { name: true, brandColor: true, logoUrl: true, iconName: true } },
    },
  },
} as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, cardId } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ValidationError("Name is required")
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Invalid email")
    }
    if (!cardId || typeof cardId !== "string") {
      throw new ValidationError("Invalid card ID")
    }

    const card = await prisma.loyaltyCard.findUnique({ where: { id: cardId } })
    if (!card) {
      throw new NotFoundError("Loyalty card not found")
    }

    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new ValidationError("This loyalty card has expired")
    }

    const existing = await prisma.customer.findFirst({
      where: { email, cardId },
    })
    if (existing) {
      return NextResponse.json({ existing: true })
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
      if (!customer) throw new NotFoundError("Customer not found")

      const card = await prisma.loyaltyCard.findUnique({
        where: { id: customer.cardId },
        select: { businessId: true },
      })
      if (!card || card.businessId !== business.id) {
        throw new NotFoundError("Customer not found")
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

      if (customers.length === 0) throw new NotFoundError("Customer not found")
      return NextResponse.json({ customers })
    }

    throw new ValidationError("Provide either ?id= or ?email=")
  } catch (error) {
    return handleApiError(error)
  }
}
