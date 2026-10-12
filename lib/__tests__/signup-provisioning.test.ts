import { beforeEach, describe, expect, it, vi } from "vitest"

const { signupIntentFindUnique, transaction, customerCreateProfile, signupIntentUpdate } = vi.hoisted(() => ({
  signupIntentFindUnique: vi.fn(), transaction: vi.fn(), customerCreateProfile: vi.fn(), signupIntentUpdate: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({ prisma: { signupIntent: { findUnique: signupIntentFindUnique, update: signupIntentUpdate }, $transaction: transaction } }))
vi.mock("@/lib/account-lifecycle", () => ({ createCustomerProfile: customerCreateProfile }))
import { provisionSignup } from "../signup-provisioning"

describe("signup provisioning", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a business owner and onboarding progress without prematurely creating a business", async () => {
    signupIntentFindUnique.mockResolvedValue({ id: "intent-1", email: "owner@example.com", name: null, accountType: "BUSINESS" })
    const createUser = vi.fn().mockResolvedValue({ id: "user-1", businessId: null })
    const tx = { user: { findUnique: vi.fn().mockResolvedValue(null), create: createUser }, onboardingProgress: { upsert: vi.fn() }, signupIntent: { update: vi.fn() } }
    transaction.mockImplementation((callback) => callback(tx))

    await provisionSignup("auth-1")

    expect(createUser).toHaveBeenCalledWith({ data: { authUserId: "auth-1", email: "owner@example.com", name: "owner", role: "admin" } })
    expect(tx.onboardingProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "IN_PROGRESS" }) }))
  })

  it("creates a customer profile and no business user", async () => {
    signupIntentFindUnique.mockResolvedValue({ id: "intent-1", email: "customer@example.com", name: "Customer", accountType: "CUSTOMER" })
    customerCreateProfile.mockResolvedValue({ id: "profile-1" })

    const result = await provisionSignup("auth-1")

    expect(customerCreateProfile).toHaveBeenCalledWith(expect.anything(), { authUserId: "auth-1", email: "customer@example.com", name: "Customer" })
    expect(result).toEqual({ customerProfile: { id: "profile-1" }, user: null })
    expect(transaction).not.toHaveBeenCalled()
    expect(signupIntentUpdate).toHaveBeenCalledWith({ where: { id: "intent-1" }, data: { status: "completed" } })
  })
})
