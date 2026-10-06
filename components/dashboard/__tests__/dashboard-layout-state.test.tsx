import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { DashboardLayoutClient } from "../dashboard-layout-client"

vi.mock("../sidebar", () => ({
  DashboardSidebar: ({ collapsed, onToggleCollapse, planChangeNotice }: { collapsed: boolean; onToggleCollapse: () => void; planChangeNotice: { eventId: string } | null }) =>
    <><button onClick={onToggleCollapse}>{collapsed ? "Expandir" : "Colapsar"}</button><output data-testid="notice-event">{planChangeNotice?.eventId ?? "none"}</output></>,
}))
vi.mock("../header", () => ({ DashboardHeader: () => null }))

const props = { userEmail: "admin@dev.invalid", businessName: "Negocio", brandColor: "#123456", role: "admin" as const, accountPlan: "PRO" as const, planChangeNotice: null }
const layout = () => <DashboardLayoutClient {...props}>Contenido</DashboardLayoutClient>

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.classList.remove("sidebar-collapsed")
})
afterEach(cleanup)

describe("Preferencia persistida del sidebar", () => {
  it("renderiza en servidor y recupera el estado guardado en el cliente", () => {
    window.localStorage.setItem("dashboard-sidebar-state", "true")
    expect(renderToString(layout())).toContain("Contenido")
    render(layout())
    expect(screen.getByRole("button", { name: "Expandir" })).toBeVisible()
    expect(document.documentElement).toHaveClass("sidebar-collapsed")
  })

  it("persiste el toggle y conserva el estado al volver a montar", () => {
    render(layout())
    fireEvent.click(screen.getByRole("button", { name: "Colapsar" }))
    expect(window.localStorage.getItem("dashboard-sidebar-state")).toBe("true")
    cleanup()
    render(layout())
    fireEvent.click(screen.getByRole("button", { name: "Expandir" }))
    expect(window.localStorage.getItem("dashboard-sidebar-state")).toBe("false")
    expect(document.documentElement).not.toHaveClass("sidebar-collapsed")
  })

  it("actualiza la vista al recibir un cambio de almacenamiento", () => {
    render(layout())
    act(() => {
      window.localStorage.setItem("dashboard-sidebar-state", "true")
      window.dispatchEvent(new StorageEvent("storage", { key: "dashboard-sidebar-state" }))
    })
    expect(screen.getByRole("button", { name: "Expandir" })).toBeVisible()
  })

  it("pasa el aviso de cambio de plan al sidebar", () => {
    render(<DashboardLayoutClient {...props} planChangeNotice={{ eventId: "event-42", from: "PRO", to: "LITE" }}>Contenido</DashboardLayoutClient>)
    expect(screen.getByTestId("notice-event")).toHaveTextContent("event-42")
  })
})
