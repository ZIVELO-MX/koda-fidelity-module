import type { PrismaClient } from "@prisma/client"
import { createAdminClient } from "@/lib/supabase-admin"

export const PRIVATE_AVATAR_URL_TTL_SECONDS = 60 * 60

type StoredAvatar = { id: string; avatarPath?: string | null }

function isOwnedAvatarPath(path: string | null | undefined, ownerPrefix: string) {
  return Boolean(path && path.startsWith(`${ownerPrefix}/`) && !path.split("/").includes(".."))
}

export async function signPrivateAvatarPath(path: string | null | undefined, ownerPrefix: string) {
  if (!isOwnedAvatarPath(path, ownerPrefix)) return null
  const admin = createAdminClient()
  return signPrivateAvatarPathWithClient(admin, path!, ownerPrefix)
}

export async function signPrivateAvatarPathWithClient(
  admin: ReturnType<typeof createAdminClient>,
  path: string | null | undefined,
  ownerPrefix: string,
) {
  if (!isOwnedAvatarPath(path, ownerPrefix)) return null
  const bucket = process.env.SUPABASE_PRIVATE_AVATAR_BUCKET || "avatars"
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path!, PRIVATE_AVATAR_URL_TTL_SECONDS)
  if (error) throw error
  return data?.signedUrl ?? null
}

export async function withCustomerAvatarUrl<T extends StoredAvatar>(profile: T | null) {
  if (!profile) return null
  return { ...profile, avatarUrl: await signPrivateAvatarPath(profile.avatarPath, `customer/${String(profile.id)}`) }
}

export async function withBusinessAvatarUrl<T extends { id: string }>(db: PrismaClient, business: T) {
  const asset = await db.businessAvatarAsset.findFirst({
    where: { businessId: business.id, status: "PENDING", deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { storagePath: true },
  })
  return {
    ...business,
    avatarUrl: await signPrivateAvatarPath(asset?.storagePath, `business/${business.id}`),
  }
}
