import { beforeEach, describe, expect, it, vi } from "vitest"

const { createSignedUrl, createAdminClient } = vi.hoisted(() => {
  const createSignedUrl = vi.fn()
  return {
    createSignedUrl,
    createAdminClient: vi.fn(() => ({ storage: { from: vi.fn(() => ({ createSignedUrl })) } })),
  }
})

vi.mock("@/lib/supabase-admin", () => ({ createAdminClient }))

import { signPrivateAvatarPath, signPrivateAvatarPathWithClient, withBusinessAvatarUrl, withCustomerAvatarUrl } from "../private-avatar"

describe("private avatar URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/avatar" }, error: null })
    process.env.SUPABASE_PRIVATE_AVATAR_BUCKET = "private-avatars"
  })

  it("returns null without signing a missing or foreign customer path", async () => {
    await expect(signPrivateAvatarPath(null, "customer/profile-1")).resolves.toBeNull()
    await expect(signPrivateAvatarPath("customer/profile-2/avatar.webp", "customer/profile-1")).resolves.toBeNull()
    await expect(signPrivateAvatarPath("customer/profile-1/../profile-2/avatar.webp", "customer/profile-1")).resolves.toBeNull()
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it("signs only an owned path with the private bucket and one-hour TTL", async () => {
    await expect(signPrivateAvatarPath("customer/profile-1/avatar.webp", "customer/profile-1")).resolves.toBe("https://signed/avatar")
    expect(createAdminClient).toHaveBeenCalledOnce()
    expect(createSignedUrl).toHaveBeenCalledWith("customer/profile-1/avatar.webp", 3600)
  })

  it("adds avatarUrl to a customer profile without removing avatarPath", async () => {
    await expect(withCustomerAvatarUrl({ id: "profile-1", avatarPath: "customer/profile-1/avatar.webp", name: "Ada" })).resolves.toMatchObject({
      id: "profile-1",
      avatarPath: "customer/profile-1/avatar.webp",
      avatarUrl: "https://signed/avatar",
    })
  })

  it("uses the latest pending business asset and returns null when none exists", async () => {
    const findFirst = vi.fn().mockResolvedValue({ storagePath: "business/business-1/avatar.webp" })
    const business = await withBusinessAvatarUrl({ businessAvatarAsset: { findFirst } } as never, { id: "business-1", name: "Koda" })
    expect(findFirst).toHaveBeenCalledWith({
      where: { businessId: "business-1", status: "PENDING", deletedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { storagePath: true },
    })
    expect(business.avatarUrl).toBe("https://signed/avatar")

    const empty = await withBusinessAvatarUrl({ businessAvatarAsset: { findFirst: vi.fn().mockResolvedValue(null) } } as never, { id: "business-1" })
    expect(empty.avatarUrl).toBeNull()
  })

  it("propagates storage signing failures", async () => {
    const admin = { storage: { from: vi.fn(() => ({ createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: new Error("storage down") }) })) } } as never
    await expect(signPrivateAvatarPathWithClient(admin, "business/business-1/avatar.webp", "business/business-1")).rejects.toThrow("storage down")
  })
})
