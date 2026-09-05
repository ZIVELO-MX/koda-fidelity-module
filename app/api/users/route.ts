import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError, requireRole } from "@/lib/api-utils"

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List business users
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: User list } }
 *   post:
 *     tags: [Users]
 *     summary: Invite a business user
 *     security: [{ cookieAuth: [] }]
 *     responses: { 202: { description: Invitation created } }
 */
import { createAdminClient } from "@/lib/supabase-admin"
import { createInvitationToken, enforceRateLimit, normalizeEmail } from "@/lib/auth-security"
import { sendSecureInviteEmail } from "@/lib/invite-email"

export async function GET() {
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")

    const users = await prisma.user.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })
    const invitations = await prisma.teamInvitation.findMany({
      where: { businessId: business.id }, orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, status: true, expiresAt: true, createdAt: true },
    })

    return NextResponse.json({ users, invitations })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { business, user } = await getBusinessFromSession()
    requireRole(user, "admin")

    const body = await request.json()
    const { name, role } = body
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Valid email is required")
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ValidationError("Name is required")
    }
    if (role !== "admin" && role !== "sellador") {
      throw new ValidationError("Role must be 'admin' or 'sellador'")
    }

    const memberLimit = parseInt(process.env.TEAM_MEMBER_LIMIT ?? "3", 10)
    await enforceRateLimit("invitation-business", business.id, 10, 60 * 60 * 1000)
    await enforceRateLimit("invitation-recipient", email, 3, 60 * 60 * 1000)
    await enforceRateLimit("invitation-ip", request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", 20, 60 * 60 * 1000)
    const memberCount = await prisma.user.count({ where: { businessId: business.id } })
    if (memberCount >= memberLimit) {
      throw new ValidationError(`Team member limit of ${memberLimit} reached`)
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ValidationError("A user with that email already exists")
    }

    const { token, tokenHash } = createInvitationToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const invitation = await prisma.teamInvitation.create({
      data: { email, name: name.trim(), role, tokenHash, expiresAt, businessId: business.id, invitedById: user.id },
      select: { id: true, email: true, name: true, role: true, status: true, expiresAt: true, createdAt: true },
    })
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const supabase = createAdminClient()
    const callbackTarget = `${baseUrl}/auth/callback?next=${encodeURIComponent(`/invite?token=${token}`)}`
    const { error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: callbackTarget,
      data: { name: name.trim() },
    })

    if (authError) {
      if (authError.message.includes("already been registered")) {
        const { data: link, error: linkError } = await supabase.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: callbackTarget } })
        if (linkError || !link.properties?.action_link) throw new Error(linkError?.message || "Could not create invitation link")
        await sendSecureInviteEmail({ email, name: name.trim(), businessName: business.name, url: link.properties.action_link })
      } else {
        await prisma.teamInvitation.update({ where: { id: invitation.id }, data: { status: "delivery_failed" } })
        throw new Error(authError.message)
      }
    }
    return NextResponse.json({ invitation }, { status: 202 })
  } catch (error) {
    return handleApiError(error)
  }
}
