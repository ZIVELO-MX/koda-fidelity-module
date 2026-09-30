import { describe, it, expect, vi, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { DashboardSidebar } from "../sidebar"

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/lib/actions/auth", () => ({ logout: vi.fn() }))
vi.mock("../mobile-settings-panel", () => ({ MobileSettingsPanel: () => null }))
// El AvatarImage de Radix solo pinta el <img> cuando la imagen carga, y en jsdom
// no carga nunca. Se sustituye por un marcador con la URL: lo que se prueba es que la
// foto y el marco llegan, no el cargador de Radix.
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <span data-testid="avatar" style={style}>{children}</span>
  ),
  AvatarImage: ({ src }: { src: string }) => <span data-testid="foto" data-src={src} />,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span data-testid="iniciales">{children}</span>,
}))

const BASE = { userEmail: "raul@cafeaurora.mx", businessName: "Café Aurora", brandColor: "#f97316", collapsed: false, onToggleCollapse: vi.fn() }

afterEach(cleanup)

describe("La foto de «Tu perfil» en la barra", () => {
  it("con foto, la pinta con el marco del color elegido", () => {
    const { getAllByTestId } = render(<DashboardSidebar {...BASE} role="admin" avatarUrl="https://firmada/foto.jpg" avatarRingColor="#3b82f6" />)
    expect(getAllByTestId("foto")[0]).toHaveAttribute("data-src", "https://firmada/foto.jpg")
    expect(getAllByTestId("avatar")[0].getAttribute("style")).toContain("#3b82f6")
  })

  it("sin foto quedan las iniciales, sin marco", () => {
    const { queryAllByTestId, getAllByTestId } = render(<DashboardSidebar {...BASE} role="admin" avatarUrl={null} />)
    expect(queryAllByTestId("foto")).toHaveLength(0)
    expect(getAllByTestId("iniciales")[0]).toHaveTextContent("C")
    expect(getAllByTestId("avatar")[0].getAttribute("style") ?? "").not.toContain("box-shadow")
  })
})
