import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AccountPlanChangeNotice } from "../account-plan-change-notice"

const { acknowledgePlanChangeNotice } = vi.hoisted(() => ({ acknowledgePlanChangeNotice: vi.fn() }))
vi.mock("@/lib/actions/plan-change-notice", () => ({ acknowledgePlanChangeNotice }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("AccountPlanChangeNotice", () => {
  it("shows an empty state when there is no plan change", () => {
    render(<AccountPlanChangeNotice notice={null} collapsed={false} />)
    fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }))
    expect(screen.getByText("No tienes notificaciones por ahora.")).toBeInTheDocument()
  })

  it.each([
    ["PRO", "LITE", "Pro", "Lite"],
    ["LITE", "PRO", "Lite", "Pro"],
  ] as const)("announces a change from %s to %s", async (from, to, fromLabel, toLabel) => {
    render(<AccountPlanChangeNotice notice={{ eventId: "event-1", from, to }} collapsed={false} />)
    expect(screen.getByRole("button", { name: "Notificaciones, 1 sin leer" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Notificaciones, 1 sin leer" }))
    expect(screen.getByRole("status")).toHaveTextContent(`El plan de tu cuenta cambió de ${fromLabel} a ${toLabel}.`)
  })

  it("acknowledges the notice and removes its unread indicator", async () => {
    acknowledgePlanChangeNotice.mockResolvedValue(true)
    render(<AccountPlanChangeNotice notice={{ eventId: "event-1", from: "PRO", to: "LITE" }} collapsed={false} />)
    fireEvent.click(screen.getByRole("button", { name: "Notificaciones, 1 sin leer" }))
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }))

    await waitFor(() => expect(screen.getByRole("button", { name: "Notificaciones" })).toBeInTheDocument())
    expect(acknowledgePlanChangeNotice).toHaveBeenCalledWith("event-1")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("keeps the unread indicator and allows retry when acknowledgement fails", async () => {
    acknowledgePlanChangeNotice.mockResolvedValue(false)
    render(<AccountPlanChangeNotice notice={{ eventId: "event-1", from: "LITE", to: "PRO" }} collapsed={false} />)
    fireEvent.click(screen.getByRole("button", { name: "Notificaciones, 1 sin leer" }))
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }))

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar el aviso"))
    expect(screen.getByRole("button", { name: "Notificaciones, 1 sin leer" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Entendido" })).toBeEnabled()
  })
})
