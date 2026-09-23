import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAccountPrincipal, getBusinessFromSession, createCustomerProfile, prisma, createSignedUrl } = vi.hoisted(() => ({
  getAccountPrincipal: vi.fn(),
  getBusinessFromSession: vi.fn(),
  createCustomerProfile: vi.fn(),
  prisma: {
    customerProfile: { findUnique: vi.fn() },
    businessAvatarAsset: { findFirst: vi.fn() },
  },
  createSignedUrl: vi.fn(),
}))

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return { ...actual, getAccountPrincipal, getBusinessFromSession }
})
vi.mock("@/lib/prisma", () => ({ prisma }))
vi.mock("@/lib/account-lifecycle", () => ({ createCustomerProfile }))
vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: vi.fn(() => ({ storage: { from: vi.fn(() => ({ createSignedUrl })) } })),
}))

import { GET as getCustomerProfile, PUT as putCustomerProfile } from "./customer-profile/route"
import { GET as getBusiness } from "./business/route"

describe("avatar readback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAccountPrincipal.mockResolvedValue({ id: "auth-1" })
    getBusinessFromSession.mockResolvedValue({ business: { id: "business-1", name: "Koda" } })
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/avatar" }, error: null })
  })

  it("returns a fresh customer avatarUrl from the stored path", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "profile-1", name: "Ada", avatarPath: "customer/profile-1/avatar.webp" })

    const response = await getCustomerProfile(new Request("http://localhost/api/customer-profile") as never)
    const body = await response.json()

    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(body.profile).toMatchObject({ avatarUrl: "https://signed/avatar" })
    expect(body.profile).not.toHaveProperty("avatarPath")
    expect(createSignedUrl).toHaveBeenCalledWith("customer/profile-1/avatar.webp", 3600)
  })

  it("keeps an existing avatar when PUT updates only the name", async () => {
    createCustomerProfile.mockResolvedValue({ id: "profile-1", name: "Ada", avatarPath: "customer/profile-1/avatar.webp" })

    const response = await putCustomerProfile(new Request("http://localhost/api/customer-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada", avatarPath: "customer/other/avatar.webp" }),
    }) as never)
    const body = await response.json()

    expect(createCustomerProfile).toHaveBeenCalledWith(prisma, { authUserId: "auth-1", email: "", name: "Ada" })
    expect(body.profile.avatarUrl).toBe("https://signed/avatar")
    expect(body.profile).not.toHaveProperty("avatarPath")
  })

  it("returns a fresh business avatarUrl from the latest pending asset", async () => {
    prisma.businessAvatarAsset.findFirst.mockResolvedValue({ storagePath: "business/business-1/avatar.webp" })

    const response = await getBusiness(new Request("http://localhost/api/business") as never)
    const body = await response.json()

    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(body.business.avatarUrl).toBe("https://signed/avatar")
    expect(prisma.businessAvatarAsset.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: "business-1", status: "PENDING", deletedAt: null } }))
  })
})
