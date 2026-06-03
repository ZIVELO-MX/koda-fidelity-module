import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError } from "@/lib/api-utils"

/**
 * @openapi
 * /api/business:
 *   get:
 *     tags:
 *       - Business
 *     summary: Get business profile
 *     description: Returns the authenticated business profile. Requires an active session.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Business profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 business:
 *                   $ref: '#/components/schemas/Business'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags:
 *       - Business
 *     summary: Update business profile
 *     description: Updates the authenticated business data.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Business name
 *               brandColor:
 *                 type: string
 *                 description: Brand color in hexadecimal format
 *                 example: "#ff6b35"
 *               logoUrl:
 *                 type: string
 *                 description: Logo URL
 *     responses:
 *       200:
 *         description: Updated business
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 business:
 *                   $ref: '#/components/schemas/Business'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const business = await getBusinessFromSession()
    return NextResponse.json({ business })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const business = await getBusinessFromSession()
    const body = await request.json()

    if (body.name !== undefined && (!body.name || typeof body.name !== "string" || !body.name.trim())) {
      throw new ValidationError("Business name is required")
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...(body.name?.trim() && { name: body.name.trim() }),
        ...(body.brandColor !== undefined && { brandColor: body.brandColor }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.businessType !== undefined && { businessType: body.businessType || null }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.website !== undefined && { website: body.website || null }),
        ...(body.instagram !== undefined && { instagram: body.instagram || null }),
        ...(body.iconName !== undefined && { iconName: body.iconName || null }),
      },
    })

    return NextResponse.json({ business: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
