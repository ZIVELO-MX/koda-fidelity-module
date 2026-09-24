import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { SolicitudCreada } from "../alta"

const SOLICITUD = { folio: "KF-2026-0042", plan: "LITE" as const, intervalo: "ANNUAL" as const }

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function pintar(extra: Partial<React.ComponentProps<typeof SolicitudCreada>> = {}) {
  return render(
    <SolicitudCreada
      solicitud={SOLICITUD}
      negocio="Café Aurora"
      correo="raul@cafeaurora.mx"
      copiado={false}
      onCopiar={() => {}}
      {...extra}
    />,
  )
}

describe("SolicitudCreada", () => {
  it("enseña el folio y el plan solicitado", () => {
    pintar()
    expect(screen.getByText("KF-2026-0042")).toBeInTheDocument()
    expect(screen.getByText(/plan lite, anual/i)).toBeInTheDocument()
  })

  it("dice lo que NO pasó, que es lo que un folio a secas haría creer", () => {
    pintar()
    const aviso = screen.getByText(/falta que tú mandes el correo/i)
    expect(aviso).toBeInTheDocument()
    const texto = aviso.parentElement?.textContent ?? ""
    for (const promesa of ["no envía nada", "no cobra", "no activa tu plan", "no publica tu tarjeta"]) {
      expect(texto, promesa).toContain(promesa)
    }
    expect(texto).toMatch(/soporte confirma las condiciones/i)
  })

  it("el enlace de correo va a soporte con el folio dentro", () => {
    pintar()
    const enlace = screen.getByRole("link", { name: /soporte@zivelo\.dev/i })
    const href = enlace.getAttribute("href") ?? ""
    expect(href.startsWith("mailto:soporte@zivelo.dev?")).toBe(true)
    expect(href).toContain(encodeURIComponent("KF-2026-0042"))
  })

  it("ofrece copiar el texto, para cuando el correo no abre", async () => {
    const escribir = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText: escribir } })
    const onCopiar = vi.fn()
    pintar({ onCopiar })

    fireEvent.click(screen.getByRole("button", { name: /copiar el texto/i }))
    await waitFor(() => expect(escribir).toHaveBeenCalledOnce())
    expect(escribir.mock.calls[0][0]).toContain("KF-2026-0042")
    await waitFor(() => expect(onCopiar).toHaveBeenCalledWith(true))
  })

  it("si el portapapeles falla no dice que copió", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) } })
    const onCopiar = vi.fn()
    pintar({ onCopiar })
    fireEvent.click(screen.getByRole("button", { name: /copiar el texto/i }))
    await waitFor(() => expect(onCopiar).toHaveBeenCalledWith(false))
  })

  it("el texto queda a la vista para copiarlo a mano", () => {
    pintar()
    fireEvent.click(screen.getByText(/ver el texto del correo/i))
    expect(screen.getByText(/Folio: KF-2026-0042/)).toBeInTheDocument()
    expect(screen.getByText(/Negocio: Café Aurora/)).toBeInTheDocument()
  })

  it("sin negocio ni correo no rellena con vacíos", () => {
    pintar({ negocio: null, correo: null })
    fireEvent.click(screen.getByText(/ver el texto del correo/i))
    expect(screen.getByText(/\(sin nombre\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(sin correo\)/)).toBeInTheDocument()
  })
})
