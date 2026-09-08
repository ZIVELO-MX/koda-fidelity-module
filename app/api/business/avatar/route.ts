import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, ValidationError, requireRole } from "@/lib/api-utils"
import { registerBusinessAvatar } from "@/lib/account-lifecycle"

const MAX_BYTES = 2 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const { business, user } = await getBusinessFromSession()
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
    const { data: signed, error: signedError } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60)
    if (signedError) throw signedError
    return NextResponse.json({ asset, avatarPath: path, signedUrl: signed.signedUrl }, { status: 201 })
  } catch (error) { return handleApiError(error) }
}
