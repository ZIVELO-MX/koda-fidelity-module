import { describe, expect, it, vi } from "vitest"

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { loyaltyCard: { findUnique } } }))
vi.mock("next/og", () => ({ ImageResponse: class {
  constructor(public element: unknown) {}
} }))

import { generateMetadata } from "@/app/join/[cardId]/layout"
import Image from "@/app/join/[cardId]/opengraph-image"

const params = { params: Promise.resolve({ cardId: "card-1" }) }

describe("metadatos públicos del alta", () => {
  it("mantiene disponibles los metadatos y la imagen genérica cuando falla la consulta", async () => {
    findUnique.mockRejectedValue(new Error("Base local inaccesible"))
    await expect(generateMetadata(params)).resolves.toHaveProperty("title")
    const image = await Image(params)
    expect(JSON.stringify(image)).toContain("Tarjetas de Lealtad Digital")
  })

  it("omite la marca y el premio cuando la tarjeta está bloqueada", async () => {
    findUnique.mockResolvedValue({ status: "LOCKED_BY_PLAN", isActive: false, expiresAt: null, business: { name: "Marca de prueba" }, reward: "Premio privado" })
    expect(await generateMetadata(params)).toEqual({ title: "Esta tarjeta no está disponible" })
    expect(JSON.stringify(await Image(params))).not.toContain("Premio privado")
  })
})
