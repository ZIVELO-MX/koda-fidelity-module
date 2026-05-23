import { createAdminClient } from "./supabase-admin"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "pass-images"

function getStorageUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL no está configurado")
  return url
}

export function getPublicUrl(filePath: string): string {
  const base = getStorageUrl()
  return `${base}/storage/v1/object/public/${BUCKET}/${filePath}`
}

export async function uploadPassImage(filePath: string, buffer: Buffer): Promise<string> {
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: "image/png",
    upsert: true,
  })
  if (error) throw error
  return getPublicUrl(filePath)
}
