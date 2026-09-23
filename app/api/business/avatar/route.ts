import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { prisma } from "@/lib/prisma"
import { requireWritableBusinessPrincipal, handleApiError, ValidationError, requireRole, requestIdFrom, withRequestId } from "@/lib/api-utils"
import { registerBusinessAvatar } from "@/lib/account-lifecycle"
import { signPrivateAvatarPathWithClient } from "@/lib/private-avatar"

const MAX_BYTES = 2 * 1024 * 1024

/**
 * @openapi
 * /api/business/avatar:
 *   post:
 *     tags: [Business]
 *     summary: Upload a business avatar
 *     security: [{ cookieAuth: [] }]
 *     responses: { 201: { description: Uploaded avatar } }
 */

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business, user } = await requireWritableBusinessPrincipal()
    requireRole(user, "admin")
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File) || !file.type.startsWith("image/")) throw new ValidationError("Selecciona una imagen válida")
    if (file.size > MAX_BYTES) throw new ValidationError("El avatar no puede superar 2 MB")
    const bucket = process.env.SUPABASE_PRIVATE_AVATAR_BUCKET || "avatars"
    const path = `business/${business.id}/${randomUUID()}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const admin = createAdminClient()
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const asset = await registerBusinessAvatar(prisma, business.id, path)
    const avatarUrl = await signPrivateAvatarPathWithClient(admin, path, `business/${business.id}`)
    const { storagePath: _storagePath, ...publicAsset } = asset
    return withRequestId(NextResponse.json({ asset: { ...publicAsset, avatarUrl }, signedUrl: avatarUrl }, { status: 201, headers: { "Cache-Control": "private, no-store" } }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
