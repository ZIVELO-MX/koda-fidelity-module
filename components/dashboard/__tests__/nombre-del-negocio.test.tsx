import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import BrandingPage from "@/app/dashboard/(main)/branding/page"
import { SettingsClient } from "@/app/dashboard/(main)/settings/settings-client"

/**
 * El nombre del negocio lo posee Marca.
 *
 * Se editaba en las dos pantallas, cada una con su guardado, y el último que
 * guardabas pisaba al otro. La comprobación anterior solo miraba que el id
 * `#businessName` no estuviera en Configuración, y eso no impide que el PUT
 * siga mandando el campo. Aquí se miran los cuerpos que salen de verdad.
 */

const NEGOCIO = {
  name: "Café Aurora",
  nickname: "Raúl",
  email: "raul@cafeaurora.mx",
  brandColor: "#f97316",
  logoUrl: "",
  iconName: null,
  stampIconName: null,
  businessType: "Cafetería",
  address: "Calle 1",
  phone: "5512345678",
  website: "",
  instagram: "",
}

function servidor() {
  const puts: Record<string, unknown>[] = []
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const metodo = init?.method ?? "GET"
    if (metodo === "PUT" && String(url).startsWith("/api/business")) {
      puts.push(JSON.parse(String(init?.body)))
      return { ok: true, status: 200, json: async () => ({ business: NEGOCIO }) }
    }
    if (String(url).startsWith("/api/customer/profile")) {
      return { ok: true, status: 200, json: async () => ({ profile: null }) }
    }
    return { ok: true, status: 200, json: async () => ({ business: NEGOCIO }) }
  }) as unknown as typeof fetch
  return puts
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("el nombre del negocio tiene un solo dueño", () => {
  it("Marca manda el nombre editado, y lo recupera al recargar", async () => {
    const puts = servidor()
    const { unmount } = render(<BrandingPage />)
    const campo = await screen.findByDisplayValue("Café Aurora")

    fireEvent.change(campo, { target: { value: "Café Aurora Centro" } })
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0].name).toBe("Café Aurora Centro")

    // Recargar la pantalla vuelve a pedir el negocio y pinta lo que el servidor
    // devuelve: el valor no vive en el navegador.
    unmount()
    render(<BrandingPage />)
    expect(await screen.findByDisplayValue("Café Aurora")).toBeInTheDocument()
  })

  it("Configuración guarda sus campos sin mandar el nombre", async () => {
    const puts = servidor()
    render(<SettingsClient role="admin" />)
    await screen.findByDisplayValue("Cafetería")

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }))
    await waitFor(() => expect(puts).toHaveLength(1))

    // Ausente, no vacío: el PUT es parcial, así que omitirlo lo deja intacto y
    // mandarlo vacío lo borraría.
    expect(Object.keys(puts[0])).not.toContain("name")
    expect(puts[0].businessType).toBe("Cafetería")
  })

  it("ninguna pantalla edita un campo de la otra", async () => {
    const puts = servidor()
    render(<BrandingPage />)
    await screen.findByDisplayValue("Café Aurora")
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }))
    await waitFor(() => expect(puts).toHaveLength(1))
    const deMarca = new Set(Object.keys(puts[0]))
    cleanup()

    render(<SettingsClient role="admin" />)
    await screen.findByDisplayValue("Cafetería")
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }))
    await waitFor(() => expect(puts).toHaveLength(2))
    const deConfiguracion = new Set(Object.keys(puts[1]))

    // Sin solape no hay forma de que un guardado pise al otro, que es la
    // regresión original. Esta aserción es la que hay que mantener: si alguien
    // vuelve a añadir un campo compartido, falla aquí y no en producción.
    const compartidos = [...deMarca].filter((campo) => deConfiguracion.has(campo))
    expect(compartidos, `campos editables desde las dos pantallas: ${compartidos.join(", ")}`).toEqual([])
  })

  it("Configuración enseña el nombre pero manda a Marca para cambiarlo", async () => {
    servidor()
    render(<SettingsClient role="admin" />)
    expect(await screen.findByText("Café Aurora")).toBeInTheDocument()
    const enlace = screen.getByRole("link", { name: /cambiar en marca/i })
    expect(enlace).toHaveAttribute("href", "/dashboard/branding")
    // Y no hay ningún campo con el que se pueda editar desde aquí.
    expect(screen.queryByDisplayValue("Café Aurora")).toBeNull()
  })
})
