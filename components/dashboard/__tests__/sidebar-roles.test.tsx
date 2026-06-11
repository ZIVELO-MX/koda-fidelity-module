import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { DashboardSidebar } from "../sidebar"

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }))
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock("@/lib/actions/auth", () => ({ logout: vi.fn() }))
vi.mock("../mobile-settings-panel", () => ({
  MobileSettingsPanel: () => <div data-testid="mobile-settings" />,
}))

const BASE_PROPS = {
  userEmail: "test@test.com",
  businessName: "Mi Negocio",
  brandColor: "#f97316",
}

// sidebar renders desktop + mobile — items may appear more than once
const hasText = (text: string) => screen.getAllByText(text).length > 0
const lacksText = (text: string) => screen.queryAllByText(text).length === 0

describe("DashboardSidebar — role-based navigation", () => {
  afterEach(() => cleanup())

  describe("admin role", () => {
    beforeEach(() => {
      render(<DashboardSidebar {...BASE_PROPS} role="admin" />)
    })

    it("shows Panel", () => expect(hasText("Panel")).toBe(true))
    it("shows Tarjetas de Lealtad", () => expect(hasText("Tarjetas de Lealtad")).toBe(true))
    it("shows Clientes", () => expect(hasText("Clientes")).toBe(true))
    it("shows Marca", () => expect(hasText("Marca")).toBe(true))
    it("shows Configuración", () => expect(hasText("Configuración")).toBe(true))
    it("shows Equipo", () => expect(hasText("Equipo")).toBe(true))
    it("shows Documentación", () => expect(hasText("Documentación")).toBe(true))
    it("does not show Sellador badge", () => expect(lacksText("Sellador")).toBe(true))
  })

  describe("sellador role", () => {
    beforeEach(() => {
      render(<DashboardSidebar {...BASE_PROPS} role="sellador" />)
    })

    it("shows Panel", () => expect(hasText("Panel")).toBe(true))
    it("shows Clientes", () => expect(hasText("Clientes")).toBe(true))
    it("does NOT show Marca", () => expect(lacksText("Marca")).toBe(true))
    it("does NOT show Equipo", () => expect(lacksText("Equipo")).toBe(true))
    it("does NOT show Documentación", () => expect(lacksText("Documentación")).toBe(true))
    it("shows Sellador badge", () => expect(hasText("Sellador")).toBe(true))
  })
})
