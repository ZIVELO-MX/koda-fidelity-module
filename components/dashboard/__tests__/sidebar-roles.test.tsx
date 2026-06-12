import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { DashboardSidebar } from "../sidebar"

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }))
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock("@/lib/actions/auth", () => ({ logout: vi.fn() }))

// Capture navGroups prop so we can assert mobile menu content per role
const capturedProps = { current: null as any }
vi.mock("../mobile-settings-panel", () => ({
  MobileSettingsPanel: (props: any) => {
    capturedProps.current = props
    return <div data-testid="mobile-settings" />
  },
}))

const BASE_PROPS = {
  userEmail: "test@test.com",
  businessName: "Mi Negocio",
  brandColor: "#f97316",
}

// sidebar renders desktop + mobile — items may appear more than once
const hasText = (text: string) => screen.getAllByText(text).length > 0
const lacksText = (text: string) => screen.queryAllByText(text).length === 0

function openMobileMenu() {
  fireEvent.click(screen.getByLabelText("Abrir menú"))
}

describe("DashboardSidebar — role-based navigation", () => {
  afterEach(() => {
    cleanup()
    capturedProps.current = null
  })

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

    describe("mobile menu panel (admin)", () => {
      beforeEach(() => openMobileMenu())

      it("opens MobileSettingsPanel with navGroups", () => {
        expect(capturedProps.current).not.toBeNull()
        expect(Array.isArray(capturedProps.current.navGroups)).toBe(true)
      })

      it("includes the complete navigation map (Panel, Tarjetas, Clientes, Escáner, QR)", () => {
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        for (const href of [
          "/dashboard", "/dashboard/cards", "/dashboard/customers",
          "/dashboard/scan", "/dashboard/qr-codes",
        ]) {
          expect(allHrefs).toContain(href)
        }
      })

      it("groups Panel under General and Escáner under Gestión", () => {
        const general = capturedProps.current.navGroups.find((g: any) => g.label === "General")
        const gestion = capturedProps.current.navGroups.find((g: any) => g.label === "Gestión")
        expect(general.items.map((i: any) => i.href)).toEqual(["/dashboard"])
        expect(gestion.items.map((i: any) => i.href)).toContain("/dashboard/scan")
      })

      it("includes admin-only items (Marca, Configuración, Equipo, Docs)", () => {
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        expect(allHrefs).toContain("/dashboard/branding")
        expect(allHrefs).toContain("/dashboard/settings")
        expect(allHrefs).toContain("/dashboard/team")
        expect(allHrefs).toContain("/dashboard/docs")
      })
    })
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

    describe("mobile menu panel (sellador)", () => {
      beforeEach(() => openMobileMenu())

      it("includes the complete navigation map (Panel, Tarjetas, Clientes, Escáner, QR)", () => {
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        for (const href of [
          "/dashboard", "/dashboard/cards", "/dashboard/customers",
          "/dashboard/scan", "/dashboard/qr-codes",
        ]) {
          expect(allHrefs).toContain(href)
        }
      })

      it("does NOT include admin-only items (Marca, Equipo, Docs)", () => {
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        expect(allHrefs).not.toContain("/dashboard/branding")
        expect(allHrefs).not.toContain("/dashboard/team")
        expect(allHrefs).not.toContain("/dashboard/docs")
      })

      it("includes QR codes for sellador", () => {
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        expect(allHrefs).toContain("/dashboard/qr-codes")
      })
    })
  })
})
