import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { EditCardForm } from "../edit-card-form"
import { NuevaTarjeta } from "@/app/dashboard/(main)/cards/new/nueva-tarjeta"
import type { Tema } from "@/lib/onboarding"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/**
 * Crear y editar una tarjeta mandan el tema elegido. El backend ya lo aceptaba
 * en los dos (`POST /api/cards` y `PUT /api/cards/[id]`); lo que faltaba era la
 * interfaz, que solo ofrecía los seis colores.
 */
const TEMAS: Tema[] = [
  { id: "theme-cafeteria", code: "cafeteria", plan: "LITE" },
  { id: "theme-gradiente", code: "gradiente", plan: "PRO" },
]

let peticiones: { url: string; metodo: string; cuerpo: Record<string, unknown> | null }[]
beforeEach(() => {
  peticiones = []
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    peticiones.push({ url, metodo: init?.method ?? "GET", cuerpo: init?.body ? JSON.parse(String(init.body)) : null })
    const cuerpo = url === "/api/business"
      ? { business: { name: "Café Aurora", brandColor: "#c2410c" } }
      : { card: { id: "card-1" } }
    return new Response(JSON.stringify(cuerpo), { status: 200, headers: { "Content-Type": "application/json" } })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const enviada = (metodo: string) => peticiones.find((p) => p.metodo === metodo)?.cuerpo

describe("Editar una tarjeta", () => {
  const editar = (initialThemeId: string | null) => render(
    <EditCardForm
      cardId="card-1" businessName="Café Aurora" initialName="Club Café Aurora" initialReward="Un café"
      initialColor="#c2410c" initialStampsRequired={10}
      temas={TEMAS} plan="LITE" initialThemeId={initialThemeId}
    />,
  )

  it("manda el tema elegido", async () => {
    editar(null)
    fireEvent.click(screen.getByRole("button", { name: /Cafetería/ }))
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(enviada("PUT")).toBeTruthy())
    expect(enviada("PUT")!.themeId).toBe("theme-cafeteria")
  })

  it("«Solo color» manda null para quitarlo", async () => {
    editar("theme-cafeteria")
    fireEvent.click(screen.getByRole("button", { name: "Solo color" }))
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(enviada("PUT")).toBeTruthy())
    expect(enviada("PUT")!.themeId).toBeNull()
  })

  it("arranca con el tema que la tarjeta ya tenía", () => {
    editar("theme-gradiente")
    expect(screen.getByRole("button", { name: /Gradiente/ })).toHaveAttribute("aria-pressed", "true")
  })
})

describe("Crear una tarjeta", () => {
  it("manda el tema elegido", async () => {
    render(<NuevaTarjeta temas={TEMAS} plan="LITE" />)
    fireEvent.change(document.getElementById("recompensa")!, { target: { value: "Un café" } })
    fireEvent.change(document.getElementById("nombre")!, { target: { value: "Club Café Aurora" } })
    fireEvent.click(screen.getByRole("button", { name: /Gradiente/ }))
    fireEvent.click(screen.getByRole("button", { name: "Publicar tarjeta" }))
    await waitFor(() => expect(enviada("POST")).toBeTruthy())
    expect(enviada("POST")!.themeId).toBe("theme-gradiente")
  })
})
