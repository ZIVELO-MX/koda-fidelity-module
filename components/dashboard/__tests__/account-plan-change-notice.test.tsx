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
  it.each([
    ["PRO", "LITE", "Pro", "Lite"],
    ["LITE", "PRO", "Lite", "Pro"],
  ] as const)("announces a change from %s to %s", async (_from, _to, fromLabel, toLabel) => {
    render(<AccountPlanChangeNotice eventId="event-1" from={_from} to={_to} />)
    expect(screen.getByRole("status")).toHaveTextContent(`El plan de tu cuenta cambió de ${fromLabel} a ${toLabel}.`)
  })

  it("hides and persists the notice when the user acknowledges it", async () => {
    acknowledgePlanChangeNotice.mockResolvedValue(true)
    render(<AccountPlanChangeNotice eventId="event-1" from="PRO" to="LITE" />)

    fireEvent.click(screen.getByRole("button", { name: "Entendido" }))

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
    expect(acknowledgePlanChangeNotice).toHaveBeenCalledWith("event-1")
  })

  it("keeps the notice visible if persisting the acknowledgement fails", async () => {
    acknowledgePlanChangeNotice.mockResolvedValue(false)
    render(<AccountPlanChangeNotice eventId="event-1" from="LITE" to="PRO" />)

    fireEvent.click(screen.getByRole("button", { name: "Entendido" }))

    await waitFor(() => expect(acknowledgePlanChangeNotice).toHaveBeenCalled())
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar el aviso")
  })
})
