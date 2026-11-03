import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { toast } from "sonner"
import { Alta } from "../alta"
import { avanzar, ErrorDelAlta, guardarBorrador, leerAlta, type EstadoDelAlta } from "@/lib/onboarding"

const router = vi.hoisted(() => ({ replace: vi.fn() }))
const toastMock = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn(), dismiss: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("sonner", () => ({ toast: toastMock }))
vi.mock("@/lib/onboarding", async (original) => ({
  ...await original<typeof import("@/lib/onboarding")>(),
  leerAlta: vi.fn(), guardarBorrador: vi.fn(), avanzar: vi.fn(),
}))

// Incluye el contexto que FID-0028 exige al integrar las ramas.
const INICIAL: EstadoDelAlta & { correoDeLaCuenta: string | null } = {
  step: "BUSINESS", status: "IN_PROGRESS", draftVersion: 10,
  negocio: { name: "Inicial", categoryId: "cafe" },
  tarjeta: { reward: "Un café", stampsRequired: 8 },
  acquisitionSource: null, selectedBillingInterval: null, primeraTarjetaId: null,
  categorias: [{ id: "cafe", name: "Cafetería" }],
  temas: [{ id: "foil", code: "foil", plan: "PRO" }],
  modo: "live", plan: "PRO", nombreDeLaCuenta: "Inicial", correoDeLaCuenta: null,
}

function diferida() {
  let resolver!: (estado: EstadoDelAlta) => void
  let rechazar!: (error: unknown) => void
  const promesa = new Promise<EstadoDelAlta>((resolve, reject) => {
    resolver = resolve
    rechazar = reject
  })
  return { promesa, resolver, rechazar }
}

function respuesta(nombre: string, version: number): EstadoDelAlta {
  return { ...INICIAL, negocio: { ...INICIAL.negocio, name: nombre }, draftVersion: version }
}

async function montar() {
  await act(async () => { render(<Alta />) })
}

function accionDeToast(label: string, tipo: "action" | "cancel" = "action") {
  const llamadas = vi.mocked(toast.error).mock.calls
  for (const [, opcionesDesconocidas] of [...llamadas].reverse()) {
    const opciones = opcionesDesconocidas as unknown as Record<string, { label?: string; onClick?: () => unknown } | undefined>
    const accion = opciones[tipo]
    if (accion?.label === label && accion.onClick) return accion.onClick
  }
  throw new Error(`No se publicó la acción de toast: ${label}`)
}

function escribir(nombre: string) {
  fireEvent.change(screen.getByLabelText("Nombre del negocio"), { target: { value: nombre } })
}

async function transcurrir(ms = 700) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  vi.resetAllMocks()
  vi.mocked(leerAlta).mockResolvedValue(INICIAL)
  vi.mocked(guardarBorrador).mockRejectedValue(new ErrorDelAlta({ tipo: "red" }))
  vi.mocked(avanzar).mockResolvedValue({ ...INICIAL, step: "CARD", draftVersion: 11 })
})

afterEach(() => {
  toast.dismiss()
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("Alta: guardado y avance en una sola cola", () => {
  it("Plan muestra primero la tarjeta y después los planes en un segundo slide", async () => {
    vi.mocked(leerAlta).mockResolvedValue({
      ...INICIAL,
      step: "PAYWALL",
      status: "IN_PROGRESS",
      primeraTarjetaId: "card-1",
    })

    await montar()

    expect(screen.getByRole("heading", { name: "Tu tarjeta está lista, pero todavía no publicada." })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Ahora sí, los planes." })).not.toBeInTheDocument()
    expect(screen.queryByText("Solicitar activación de Lite")).not.toBeInTheDocument()

    const continuar = screen.getByRole("button", { name: "Continuar" })
    const clasesDeContinuar = continuar.className
    fireEvent.click(continuar)

    expect(screen.getByRole("heading", { name: "Ahora sí, los planes." })).toBeInTheDocument()
    expect(screen.queryByText("Paso 2 de 2")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Tu tarjeta está lista, pero todavía no publicada." })).not.toBeInTheDocument()
    expect(avanzar).not.toHaveBeenCalled()

    const volver = screen.getByRole("button", { name: "Volver a tu tarjeta" })
    expect(volver.className).toBe(clasesDeContinuar)
    fireEvent.click(volver)

    expect(screen.getByRole("heading", { name: "Tu tarjeta está lista, pero todavía no publicada." })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Ahora sí, los planes." })).not.toBeInTheDocument()
  })

  it("Saltar sin publicar abre el muro persistente hasta que soporte active el plan", async () => {
    vi.mocked(leerAlta).mockResolvedValue({ ...INICIAL, step: "PAYWALL", status: "IN_PROGRESS", primeraTarjetaId: "card-1" })
    vi.mocked(avanzar).mockResolvedValue({ ...INICIAL, step: "PAYWALL", status: "AWAITING_PAYMENT", primeraTarjetaId: "card-1" })
    await montar()
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Saltar sin publicar" })) })

    expect(avanzar).toHaveBeenCalledWith("open_paywall", 10, undefined)
    expect(screen.getByRole("heading", { name: "Tu plan todavía no está activo" })).toBeInTheDocument()
    expect(screen.getByText(/no hay un botón para continuar/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Escribir a soporte" })).toHaveAttribute("href", "mailto:soporte@zivelo.dev")
    expect(screen.queryByRole("link", { name: /salir sin publicar/i })).not.toBeInTheDocument()
  })

  it("al recargar en espera muestra el muro y oculta selección de plan", async () => {
    vi.mocked(leerAlta).mockResolvedValue({ ...INICIAL, step: "PAYWALL", status: "AWAITING_PAYMENT", primeraTarjetaId: "card-1" })
    await montar()

    expect(screen.getByRole("heading", { name: "Tu plan todavía no está activo" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Continuar" })).not.toBeInTheDocument()
    expect(screen.queryByText("Solicitar activación de Lite")).not.toBeInTheDocument()
  })

  it("manda al panel cuando la consulta detecta la activación de soporte", async () => {
    vi.mocked(leerAlta)
      .mockResolvedValueOnce({ ...INICIAL, step: "PAYWALL", status: "AWAITING_PAYMENT", primeraTarjetaId: "card-1" })
      .mockResolvedValueOnce({ ...INICIAL, step: "PAYWALL", status: "ACTIVE", primeraTarjetaId: "card-1" })
    await montar()

    await transcurrir(5000)

    expect(router.replace).toHaveBeenCalledWith("/dashboard")
  })

  it.each([0, 700])("conserva la segunda edición en vuelo (su debounce ha transcurrido %i ms)", async (espera) => {
    const primera = diferida()
    const segunda = diferida()
    vi.mocked(guardarBorrador).mockReturnValueOnce(primera.promesa).mockReturnValueOnce(segunda.promesa)
    await montar()
    escribir("Primero")
    await transcurrir()
    escribir("Segundo")
    await transcurrir(espera)
    expect(guardarBorrador).toHaveBeenCalledTimes(1)

    await act(async () => { primera.resolver(respuesta("Primero", 11)) })
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Segundo")
    expect(screen.queryByText("Guardado", { exact: true })).not.toBeInTheDocument()
    if (espera === 0) expect(guardarBorrador).toHaveBeenCalledTimes(1)
    await transcurrir()
    expect(guardarBorrador).toHaveBeenCalledTimes(2)
    expect(guardarBorrador).toHaveBeenNthCalledWith(2, 11, expect.objectContaining({ business: { name: "Segundo" } }))

    await act(async () => { segunda.resolver(respuesta("Segundo", 12)) })
    expect(screen.getByText("Guardado", { exact: true })).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Segundo")
  })

  it.each([false, true])("Continuar espera el vuelo y lo pendiente (segunda edición: %s)", async (otraEdicion) => {
    const primera = diferida()
    const segunda = diferida()
    vi.mocked(guardarBorrador).mockReturnValueOnce(primera.promesa).mockReturnValueOnce(segunda.promesa)
    vi.mocked(avanzar).mockResolvedValue({ ...respuesta("Segundo", 13), step: "CARD" })
    await montar()
    escribir("Primero")
    await transcurrir()
    if (otraEdicion) escribir("Segundo")
    const continuar = screen.getByRole("button", { name: "Continuar" })
    fireEvent.click(continuar)
    fireEvent.click(continuar)
    expect(avanzar).not.toHaveBeenCalled()
    expect(guardarBorrador).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("Nombre del negocio")).toBeDisabled()

    await act(async () => { primera.resolver(respuesta("Primero", 11)) })
    if (otraEdicion) {
      expect(avanzar).not.toHaveBeenCalled()
      expect(guardarBorrador).toHaveBeenNthCalledWith(2, 11, expect.objectContaining({ business: { name: "Segundo" } }))
      await act(async () => { segunda.resolver(respuesta("Segundo", 12)) })
    }
    expect(avanzar).toHaveBeenCalledTimes(1)
    expect(avanzar).toHaveBeenCalledWith("complete_business", otraEdicion ? 12 : 11, undefined)
    expect(screen.getByRole("heading", { name: "Tu primera tarjeta" })).toBeInTheDocument()
  })

  it.each(["red", "servidor"] as const)("un fallo de %s conserva el lote y lo nuevo; Reintentar guarda, sin avanzar", async (tipo) => {
    const primera = diferida()
    vi.mocked(guardarBorrador).mockReturnValueOnce(primera.promesa).mockResolvedValueOnce(respuesta("Segundo", 12))
    await montar()
    escribir("Primero")
    await transcurrir()
    escribir("Segundo")
    await act(async () => { primera.rechazar(new ErrorDelAlta({ tipo, mensaje: "No se pudo guardar" })) })
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Segundo")
    expect(screen.getByRole("status")).toHaveTextContent("Tus cambios siguen aquí. Reintenta antes de cerrar.")
    expect(screen.queryByText("Guardado", { exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
    await transcurrir(1400)
    expect(guardarBorrador).toHaveBeenCalledTimes(1)

    vi.mocked(leerAlta).mockResolvedValueOnce(respuesta("Primero", 11))
    await act(async () => { await accionDeToast("Reintentar")() })
    expect(guardarBorrador).toHaveBeenNthCalledWith(2, 11, { business: { name: "Segundo" } })
    expect(screen.getByText("Guardado", { exact: true })).toBeInTheDocument()
    expect(avanzar).not.toHaveBeenCalled()
  })

  it("si falla el PATCH que esperaba Continuar, no envía el POST ni pierde la última edición", async () => {
    const primera = diferida()
    vi.mocked(guardarBorrador).mockReturnValueOnce(primera.promesa)
    await montar()
    escribir("Primero")
    await transcurrir()
    escribir("Segundo")
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    await act(async () => { primera.rechazar(new ErrorDelAlta({ tipo: "red" })) })
    expect(avanzar).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Segundo")
    expect(screen.getByRole("heading", { name: "Tu negocio" })).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre del negocio")).not.toBeDisabled()
  })

  it("recupera también los campos del lote fallido que no se volvieron a editar", async () => {
    const primera = diferida()
    const tarjeta = { ...INICIAL, step: "CARD" as const }
    vi.mocked(leerAlta).mockResolvedValueOnce(tarjeta).mockResolvedValueOnce(tarjeta)
    vi.mocked(guardarBorrador).mockReturnValueOnce(primera.promesa).mockResolvedValueOnce({
      ...tarjeta, draftVersion: 11,
      tarjeta: { ...tarjeta.tarjeta, reward: "Premio nuevo", stampsRequired: 12 },
    })
    await montar()
    fireEvent.change(screen.getByLabelText("Recompensa"), { target: { value: "Premio nuevo" } })
    await transcurrir()
    fireEvent.click(screen.getByRole("button", { name: "12" }))
    await act(async () => { primera.rechazar(new ErrorDelAlta({ tipo: "red" })) })
    expect(screen.getByLabelText("Recompensa")).toHaveValue("Premio nuevo")
    expect(screen.getByRole("button", { name: "12" })).toHaveAttribute("aria-pressed", "true")
    await act(async () => { await accionDeToast("Reintentar")() })
    expect(guardarBorrador).toHaveBeenNthCalledWith(2, 10, { card: { reward: "Premio nuevo", stampsRequired: 12 } })
    expect(screen.getByText("Guardado", { exact: true })).toBeInTheDocument()
  })

  async function provocarConflicto() {
    vi.mocked(guardarBorrador).mockRejectedValueOnce(new ErrorDelAlta({ tipo: "conflicto", mensaje: "Otra pestaña escribió" }))
    await montar()
    escribir("Local")
    await transcurrir()
    expect(leerAlta).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Local")
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
  }

  it("el 409 pausa; reaplicar usa la versión leída y solo los campos locales pendientes", async () => {
    await provocarConflicto()
    escribir("Local más reciente")
    await transcurrir(1400)
    expect(guardarBorrador).toHaveBeenCalledTimes(1)
    const servidor = { ...respuesta("Servidor", 20), negocio: { name: "Servidor", categoryId: "restaurante" } }
    vi.mocked(leerAlta).mockResolvedValueOnce(servidor)
    vi.mocked(guardarBorrador).mockResolvedValueOnce({ ...servidor, negocio: { ...servidor.negocio, name: "Local más reciente" }, draftVersion: 21 })
    await act(async () => { await accionDeToast("Reaplicar mis cambios")() })
    expect(guardarBorrador).toHaveBeenNthCalledWith(2, 20, { business: { name: "Local más reciente" } })
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Local más reciente")
    expect(screen.getByText("Guardado", { exact: true })).toBeInTheDocument()
    expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1)
    expect(avanzar).not.toHaveBeenCalled()
  })

  it.each([false, true])("usar el servidor exige confirmación de descarte (%s)", async (confirmacion) => {
    await provocarConflicto()
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(confirmacion)
    vi.mocked(leerAlta).mockResolvedValueOnce(respuesta("Servidor", 20))
    await act(async () => { await accionDeToast("Usar versión del servidor", "cancel")() })
    expect(confirmar).toHaveBeenCalledWith(expect.stringMatching(/descartar/i))
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue(confirmacion ? "Servidor" : "Local")
    expect(leerAlta).toHaveBeenCalledTimes(confirmacion ? 2 : 1)
    expect(guardarBorrador).toHaveBeenCalledTimes(1)
    expect(avanzar).not.toHaveBeenCalled()
  })

  it("si falla la lectura al adoptar el servidor, conserva lo local y la pausa", async () => {
    await provocarConflicto()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    vi.mocked(leerAlta).mockRejectedValueOnce(new ErrorDelAlta({ tipo: "red" }))
    await act(async () => { await accionDeToast("Usar versión del servidor", "cancel")() })
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Local")
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
    expect(screen.queryByText("Guardado", { exact: true })).not.toBeInTheDocument()
  })

  it("un alta terminada en otra pestaña no recibe una reaplicación de borrador", async () => {
    await provocarConflicto()
    vi.mocked(leerAlta).mockResolvedValueOnce({ ...respuesta("Servidor", 20), status: "ACTIVE" })
    await act(async () => { await accionDeToast("Reaplicar mis cambios")() })
    expect(screen.getByLabelText("Nombre del negocio")).toHaveValue("Local")
    expect(guardarBorrador).toHaveBeenCalledTimes(1)
    expect(avanzar).not.toHaveBeenCalled()
    expect(vi.mocked(toast.error).mock.calls.some(([message]) => String(message).match(/cambió de estado/i))).toBe(true)
  })

  it.each([10, 8])("confirmar tarjeta guarda los sellos visibles (%i), respetando lo editado en vuelo", async (sellos) => {
    const tarjeta = { ...INICIAL, step: "CARD" as const, tarjeta: { reward: "Un café" } }
    vi.mocked(leerAlta).mockResolvedValueOnce(tarjeta)
    vi.mocked(guardarBorrador).mockResolvedValueOnce({ ...tarjeta, draftVersion: 11, tarjeta: { ...tarjeta.tarjeta, stampsRequired: sellos } })
    vi.mocked(avanzar).mockResolvedValueOnce({ ...tarjeta, draftVersion: 12, step: "ACQUISITION" })
    await montar()
    expect(screen.getByRole("button", { name: "10" })).toHaveAttribute("aria-pressed", "true")
    if (sellos === 8) fireEvent.click(screen.getByRole("button", { name: "8" }))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Continuar" })) })
    expect(guardarBorrador).toHaveBeenCalledTimes(1)
    expect(guardarBorrador).toHaveBeenCalledWith(10, { card: { stampsRequired: sellos } })
    expect(avanzar).toHaveBeenCalledWith("complete_card", 11, undefined)
  })

  it("confirmar los sellos iniciales no inventa una recompensa ausente", async () => {
    const tarjeta = { ...INICIAL, step: "CARD" as const, tarjeta: {} }
    vi.mocked(leerAlta).mockResolvedValueOnce(tarjeta)
    vi.mocked(guardarBorrador).mockResolvedValueOnce({ ...tarjeta, draftVersion: 11, tarjeta: { stampsRequired: 10 } })
    vi.mocked(avanzar).mockRejectedValueOnce(new ErrorDelAlta({ tipo: "validacion", mensaje: "Completa recompensa y sellos de la tarjeta" }))
    await montar()
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Continuar" })) })
    expect(guardarBorrador).not.toHaveBeenCalled()
    expect(avanzar).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Recompensa")).toHaveValue("")
    expect(screen.getByRole("heading", { name: "Tu primera tarjeta" })).toBeInTheDocument()
    expect(vi.mocked(toast.error).mock.calls.some(([message]) => String(message) === "Escribe la recompensa para continuar.")).toBe(true)
    expect(screen.getByLabelText("Recompensa")).toHaveAttribute("aria-invalid", "true")
  })

  it("no muestra el Club si el POST de crear tarjeta falla", async () => {
    vi.mocked(leerAlta).mockResolvedValueOnce({ ...INICIAL, step: "CARD" })
    vi.mocked(avanzar).mockRejectedValueOnce(new ErrorDelAlta({ tipo: "servidor", mensaje: "No se creó" }))
    await montar()
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Continuar" })) })
    expect(screen.getByRole("heading", { name: "Tu primera tarjeta" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Club Inicial" })).not.toBeInTheDocument()
    expect(vi.mocked(toast.error).mock.calls.some(([message]) => String(message) === "No se creó")).toBe(true)
  })

  it("cancelar la pantalla detiene el temporizador y no envía el borrador", async () => {
    await montar()
    escribir("Pendiente")
    cleanup()
    await transcurrir()
    expect(guardarBorrador).not.toHaveBeenCalled()
  })

  it("al desmontar con un PATCH en vuelo no inicia otro para la cola", async () => {
    const primera = diferida()
    vi.mocked(guardarBorrador).mockReturnValueOnce(primera.promesa)
    await montar()
    escribir("Primero")
    await transcurrir()
    escribir("Segundo")
    await transcurrir()
    cleanup()
    await act(async () => { primera.resolver(respuesta("Primero", 11)) })
    await transcurrir()
    expect(guardarBorrador).toHaveBeenCalledTimes(1)
  })
})
