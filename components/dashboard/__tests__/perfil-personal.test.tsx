import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { PerfilPersonal } from "../perfil-personal"

type Perfil = { id: string; name: string; avatarUrl: string | null; avatarRingColor: string }

const PERFIL: Perfil = { id: "p1", name: "Raúl Méndez", avatarUrl: null, avatarRingColor: "#3b82f6" }

function responder(perfil: Perfil | null) {
  const llamadas: { url: string; metodo: string; cuerpo: unknown }[] = []
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const metodo = init?.method ?? "GET"
    llamadas.push({ url, metodo, cuerpo: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body })
    if (metodo === "GET") return { ok: true, json: async () => ({ profile: perfil }) }
    return { ok: true, json: async () => ({ profile: { ...PERFIL, ...(typeof init?.body === "string" ? JSON.parse(init.body) : {}) } }) }
  }) as unknown as typeof fetch
  return llamadas
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("PerfilPersonal", () => {
  it("no ofrece subir foto hasta que el perfil existe, y dice por qué", async () => {
    responder(null)
    render(<PerfilPersonal />)

    const boton = await screen.findByRole("button", { name: /subir foto/i })
    expect(boton).toBeDisabled()
    expect(screen.getByText(/guarda tu nombre para poder subir una foto/i)).toBeInTheDocument()
  })

  it("el primer guardado crea con PUT y solo después actualiza con PATCH", async () => {
    const llamadas = responder(null)
    render(<PerfilPersonal />)
    await screen.findByLabelText("Tu nombre")

    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Raúl Méndez" } })
    fireEvent.click(screen.getByRole("button", { name: /guardar perfil/i }))

    await waitFor(() => expect(screen.getByText("Perfil guardado")).toBeInTheDocument())
    const escrituras = llamadas.filter((l) => l.metodo !== "GET").map((l) => l.metodo)
    expect(escrituras).toEqual(["PUT", "PATCH"])
  })

  it("con perfil existente guarda en un solo PATCH y manda el color elegido", async () => {
    const llamadas = responder(PERFIL)
    render(<PerfilPersonal />)
    await waitFor(() => expect(screen.getByLabelText("Tu nombre")).toHaveValue("Raúl Méndez"))

    fireEvent.click(screen.getByLabelText("Usar color #10b981"))
    fireEvent.click(screen.getByRole("button", { name: /guardar perfil/i }))

    await waitFor(() => expect(screen.getByText("Perfil guardado")).toBeInTheDocument())
    const escrituras = llamadas.filter((l) => l.metodo !== "GET")
    expect(escrituras).toHaveLength(1)
    expect(escrituras[0].metodo).toBe("PATCH")
    expect(escrituras[0].cuerpo).toMatchObject({ avatarRingColor: "#10b981", name: "Raúl Méndez" })
  })

  it("al recargar pinta la foto desde avatarUrl, sin depender de la subida", async () => {
    // Lo que llega de GET es una URL firmada fresca: el servidor ya no manda la
    // ruta de almacenamiento, y la pantalla no guarda nada entre recargas.
    const guardado = { ...PERFIL, avatarUrl: "https://sb.test/firma/abc?token=xyz" }
    responder(guardado)
    render(<PerfilPersonal />)

    await waitFor(() => {
      const img = document.querySelector("img")
      expect(img).not.toBeNull()
      expect(img).toHaveAttribute("src", guardado.avatarUrl)
    })
    // Y con foto el control cambia de "Subir" a "Cambiar", con su "Quitar".
    expect(screen.getByRole("button", { name: /cambiar foto/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /quitar foto/i })).toBeInTheDocument()
  })

  it("sin foto no promete una que no puede enseñar", async () => {
    responder(PERFIL)
    render(<PerfilPersonal />)
    await waitFor(() => expect(screen.getByLabelText("Tu nombre")).toHaveValue("Raúl Méndez"))
    expect(document.querySelector("img")).toBeNull()
    expect(screen.getByRole("button", { name: /subir foto/i })).toBeEnabled()
    expect(screen.queryByText(/todavía no se muestra/i)).toBeNull()
  })
})
