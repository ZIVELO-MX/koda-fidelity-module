import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { EditCardForm } from "../edit-card-form"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn(), back: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// jsdom descarta los degradados al leer el CSS: se captura qué tema recibe la
// vista previa en lugar de mirar cómo se pinta.
vi.mock("@/components/loyalty-card-preview", () => ({
  LoyaltyCardPreview: ({ themeCode }: { themeCode?: string | null }) => <div data-testid="vista-previa" data-tema={themeCode ?? ""} />,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    themes: [{ id: "theme-gradiente", code: "gradiente", plan: "PRO" }], plan: "LITE",
  }), { status: 200, headers: { "Content-Type": "application/json" } })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe("Editar una tarjeta con plan Lite", () => {
  it("previsualiza Pro, pero bloquea el guardado Lite y ofrece contactar a soporte", async () => {
    render(<EditCardForm cardId="c1" businessName="Café Aurora" initialName="Club" initialReward="Un café" initialColor="#c2410c" initialStampsRequired={10} />)
    await waitFor(() => expect(screen.getByRole("option", { name: /Gradiente vivo/ })).toBeInTheDocument())
    fireEvent.change(document.getElementById("edit-theme")!, { target: { value: "theme-gradiente" } })
    expect(screen.getByTestId("vista-previa")).toHaveAttribute("data-tema", "gradiente")
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/no puede guardarse con el plan Lite/i)
    expect(screen.getByRole("link", { name: /escribir a soporte/i })).toHaveAttribute("href", expect.stringContaining("mailto:soporte@zivelo.dev"))
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining("/api/cards/c1"), expect.objectContaining({ method: "PUT" }))
  })

  it("sends the primary checkbox state when saving a Pro card", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/card-themes") {
        return new Response(JSON.stringify({ themes: [], plan: "PRO", primaryCardId: "c1", primaryCardName: "Club" }), { status: 200 })
      }
      if (String(input) === "/api/cards/c1" && init?.method === "PUT") {
        return new Response(JSON.stringify({ card: { id: "c1" } }), { status: 200 })
      }
      throw new Error(`Unexpected fetch: ${String(input)}`)
    }))
    render(<EditCardForm cardId="c1" businessName="Café Aurora" initialName="Club" initialReward="Un café" initialColor="#c2410c" initialStampsRequired={10} initialIsPrimary initialPrimaryCardName="Club" />)

    const checkbox = await screen.findByRole("checkbox", { name: "Marcar como tarjeta principal" })
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/cards/c1"))
    const putCall = vi.mocked(fetch).mock.calls.find(([url, init]) => url === "/api/cards/c1" && init?.method === "PUT")
    expect(JSON.parse(String(putCall?.[1]?.body))).toMatchObject({ isPrimary: false })
  })

  it("allows editing a Lite card whose selected Pro theme is already using its Lite fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/card-themes") {
        return new Response(JSON.stringify({
          themes: [{ id: "theme-gradiente", code: "gradiente", plan: "PRO" }],
          plan: "LITE",
          primaryCardId: "c1",
          primaryCardName: "Club",
        }), { status: 200 })
      }
      if (String(input) === "/api/cards/c1" && init?.method === "PUT") {
        return new Response(JSON.stringify({ card: { id: "c1" } }), { status: 200 })
      }
      throw new Error(`Unexpected fetch: ${String(input)}`)
    }))
    render(<EditCardForm cardId="c1" businessName="Café Aurora" initialName="Club" initialReward="Un café" initialColor="#c2410c" initialStampsRequired={10} initialThemeId="theme-gradiente" initialIsPrimary initialPrimaryCardName="Club" />)

    await screen.findByRole("option", { name: /Gradiente vivo/ })
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/cards/c1"))
    const putCall = vi.mocked(fetch).mock.calls.find(([url, init]) => url === "/api/cards/c1" && init?.method === "PUT")
    expect(JSON.parse(String(putCall?.[1]?.body))).toMatchObject({ isPrimary: true })
    expect(JSON.parse(String(putCall?.[1]?.body))).not.toHaveProperty("themeId")
  })
})
