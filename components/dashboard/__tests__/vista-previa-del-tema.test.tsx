import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { EditCardForm } from "../edit-card-form"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// jsdom descarta los degradados al leer el CSS: se captura qué tema recibe la
// vista previa en lugar de mirar cómo se pinta.
vi.mock("@/components/loyalty-card-preview", () => ({
  LoyaltyCardPreview: ({ themeCode }: { themeCode?: string | null }) => <div data-testid="vista-previa" data-tema={themeCode ?? ""} />,
}))

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    themes: [{ id: "theme-gradiente", code: "gradiente", plan: "PRO" }], plan: "LITE",
  }), { status: 200, headers: { "Content-Type": "application/json" } })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe("Editar una tarjeta con plan Lite", () => {
  it("la vista previa enseña el acabado Pro elegido, para poder probarlo", async () => {
    render(<EditCardForm cardId="c1" businessName="Café Aurora" initialName="Club" initialReward="Un café" initialColor="#c2410c" initialStampsRequired={10} />)
    await waitFor(() => expect(screen.getByRole("option", { name: /Gradiente vivo/ })).toBeInTheDocument())
    fireEvent.change(document.getElementById("edit-theme")!, { target: { value: "theme-gradiente" } })
    expect(screen.getByTestId("vista-previa")).toHaveAttribute("data-tema", "gradiente")
    expect(screen.getByText(/se activa al pasar a Pro/)).toBeInTheDocument()
  })
})
