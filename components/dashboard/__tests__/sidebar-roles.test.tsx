import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react"
import { DashboardSidebar } from "../sidebar"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn() }),
}))
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
  collapsed: false,
  onToggleCollapse: vi.fn(),
}

// sidebar renders desktop + mobile — items may appear more than once
const hasText = (text: string) => screen.getAllByText(text).length > 0
const lacksText = (text: string) => screen.queryAllByText(text).length === 0

// La navegación de escritorio vive en el aside. El botón flotante del escáner
// es de la barra móvil, así que las aserciones de escritorio se acotan aquí.
const escritorio = () => within(document.querySelector("aside") as HTMLElement)

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
    it("shows Tarjetas", () => expect(hasText("Tarjetas")).toBe(true))
    it("shows Clientes", () => expect(hasText("Clientes")).toBe(true))
    it("shows Marca", () => expect(hasText("Marca")).toBe(true))
    it("shows Configuración", () => expect(hasText("Configuración")).toBe(true))
    it("shows Equipo", () => expect(hasText("Equipo")).toBe(true))
    it("shows Documentación", () => expect(hasText("Documentación")).toBe(true))

    it("agrupa los destinos en Operación, Programa y Negocio", () => {
      expect(hasText("Operación")).toBe(true)
      expect(hasText("Programa")).toBe(true)
      expect(hasText("Negocio")).toBe(true)
    })

    it("no ofrece el escáner en la navegación de escritorio", () => {
      expect(escritorio().queryByRole("link", { name: /escáner/i })).toBeNull()
    })

    it("no repite Panel fuera de su grupo", () => {
      expect(escritorio().getAllByRole("link", { name: "Panel" })).toHaveLength(1)
    })
    describe("mobile menu panel (admin)", () => {
      beforeEach(() => openMobileMenu())

      it("opens MobileSettingsPanel with navGroups", () => {
        expect(capturedProps.current).not.toBeNull()
        expect(Array.isArray(capturedProps.current.navGroups)).toBe(true)
      })

      it("includes the complete navigation map (Panel, Tarjetas, Clientes, QR)", () => {
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        for (const href of [
          "/dashboard", "/dashboard/cards", "/dashboard/customers", "/dashboard/qr-codes",
        ]) {
          expect(allHrefs).toContain(href)
        }
      })

      it("groups Panel under Operación and leaves the scanner to its button", () => {
        const operacion = capturedProps.current.navGroups.find((g: any) => g.label === "Operación")
        expect(operacion.items.map((i: any) => i.href)).toEqual([
          "/dashboard", "/dashboard/customers",
        ])
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        expect(allHrefs).not.toContain("/dashboard/scan")
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

    it("el sellador solo ve Operación", () => {
      expect(hasText("Operación")).toBe(true)
      expect(lacksText("Programa")).toBe(true)
      expect(lacksText("Negocio")).toBe(true)
    })

    it("no ofrece Tarjetas en la barra móvil, que su rol no administra", () => {
      expect(lacksText("Tarjetas")).toBe(true)
    })

    it("conserva el botón del escáner, que es su acción central", () => {
      expect(screen.getByRole("link", { name: /escáner/i })).toBeInTheDocument()
    })

    describe("mobile menu panel (sellador)", () => {
      beforeEach(() => openMobileMenu())

      it("includes only the operation map (Panel, Clientes)", () => {
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        expect(allHrefs).toEqual(["/dashboard", "/dashboard/customers"])
      })

      it("does NOT include admin-only items (Marca, Equipo, Docs, Tarjetas, QR)", () => {
        const allHrefs = capturedProps.current.navGroups.flatMap((g: any) =>
          g.items.map((i: any) => i.href)
        )
        for (const href of [
          "/dashboard/branding", "/dashboard/team", "/dashboard/docs",
          "/dashboard/cards", "/dashboard/qr-codes",
        ]) {
          expect(allHrefs).not.toContain(href)
        }
      })
    })
  })
})
