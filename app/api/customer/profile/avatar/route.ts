import { randomUUID } from "node:crypto"
import sharp from "sharp"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { prisma } from "@/lib/prisma"
import { getAccountPrincipal, handleApiError, NotFoundError, ValidationError } from "@/lib/api-utils"
import { replaceCustomerAvatar } from "@/lib/account-lifecycle"

const MAX_BYTES = 2 * 1024 * 1024

export async function PUT(request: NextRequest) {
  try {
    const principal = await getAccountPrincipal()
    const profile = await prisma.customerProfile.findUnique({ where: { authUserId: principal.id } })
    if (!profile) throw new NotFoundError("Perfil de cliente no encontrado")
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new ValidationError("El avatar debe ser JPG, PNG o WEBP")
    if (file.size > MAX_BYTES) throw new ValidationError("El avatar no puede superar 2 MB")
    const bucket = process.env.SUPABASE_PRIVATE_AVATAR_BUCKET || "avatars"
    const path = `customer/${profile.id}/${randomUUID()}.webp`
    const output = await sharp(Buffer.from(await file.arrayBuffer())).resize(512, 512, { fit: "cover" }).webp().toBuffer()
    const admin = createAdminClient()
    const { error } = await admin.storage.from(bucket).upload(path, output, { contentType: "image/webp", upsert: false })
    if (error) throw error
    const updated = await replaceCustomerAvatar(prisma, profile.id, bucket, path)
    const { data: signed, error: signedError } = await admin.storage.from(bucket).createSignedUrl(path, 3600)
    if (signedError) throw signedError
    return NextResponse.json({ profile: updated, signedUrl: signed.signedUrl })
  } catch (error) { return handleApiError(error) }
}

export async function DELETE() {
  try {
    const principal = await getAccountPrincipal()
    const profile = await prisma.customerProfile.findUnique({ where: { authUserId: principal.id } })
    if (!profile) throw new NotFoundError("Perfil de cliente no encontrado")
    const updated = await prisma.customerProfile.update({ where: { id: profile.id }, data: { avatarPath: null } })
    if (profile.avatarPath) await prisma.avatarCleanupJob.create({ data: { profileId: profile.id, bucket: process.env.SUPABASE_PRIVATE_AVATAR_BUCKET || "avatars", storagePath: profile.avatarPath } })
    return NextResponse.json({ profile: updated })
  } catch (error) { return handleApiError(error) }
}
