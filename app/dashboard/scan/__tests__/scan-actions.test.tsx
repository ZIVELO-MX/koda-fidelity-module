import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import ScanPage from "../page"

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}))
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
// La cámara no se monta en jsdom. Lo que se prueba aquí es la decisión de sellar
// o canjear, que llega igual por la búsqueda por nombre.
vi.mock("@/components/scan/qr-scanner", () => ({
  QRScanner: () => <div data-testid="qr-scanner" />,
}))

function cliente(stamps: number) {
  return {
    id: "cust-1",
    name: "Ana García",
    stamps,
    goal: 10,
    cardName: "Café Reward",
    cardReward: "Café gratis",
    cardBrandColor: "#FF6B35",
    cardExpiresAt: null,
  }
}

const fetchMock = vi.fn()

/** Busca por nombre y selecciona al cliente, que deja la pantalla en "found". */
async function seleccionar(stamps: number) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ items: [cliente(stamps)], page: 1, pageSize: 20, total: 1 }),
  })
  render(<ScanPage />)
  fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "Ana" } })
  const resultado = await screen.findByText("Ana García", {}, { timeout: 2000 })
  fireEvent.click(resultado)
}

describe("Escáner, una sola acción primaria", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("abre la cámara al entrar, sin pedir que se encienda", () => {
    render(<ScanPage />)
    expect(screen.getByTestId("qr-scanner")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /apagar cámara/i })).toBeInTheDocument()
  })

  it("mantiene la búsqueda por nombre visible junto al visor", () => {
    render(<ScanPage />)
    expect(screen.getByLabelText("Buscar por nombre")).toBeVisible()
  })

  it("con la tarjeta a medias, sellar es la acción y canjear no se puede", async () => {
    await seleccionar(3)
    expect(screen.getByRole("button", { name: /agregar sello/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /canjear recompensa/i })).toBeDisabled()
    expect(screen.getByText(/faltan 7 sellos para poder canjear/i)).toBeVisible()
  })

  it("con la tarjeta llena se invierte, y sellar dice por qué no se puede", async () => {
    await seleccionar(10)
    expect(screen.getByRole("button", { name: /agregar sello/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /canjear recompensa/i })).toBeEnabled()
    expect(screen.getByText(/la tarjeta está llena/i)).toBeVisible()
  })

  it("manda el tipo explícito al sellar, sin dejar que el servidor lo adivine", async () => {
    await seleccionar(3)
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ event: "stamp" }) })
    fireEvent.click(screen.getByRole("button", { name: /agregar sello/i }))

    const [ruta, opciones] = fetchMock.mock.calls.at(-1)!
    expect(ruta).toBe("/api/stamps")
    expect(JSON.parse(opciones.body)).toEqual({ customerId: "cust-1", type: "stamp" })
  })

  it("manda redeem al canjear una tarjeta llena", async () => {
    await seleccionar(10)
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ event: "redeem" }) })
    fireEvent.click(screen.getByRole("button", { name: /canjear recompensa/i }))

    const [, opciones] = fetchMock.mock.calls.at(-1)!
    expect(JSON.parse(opciones.body)).toEqual({ customerId: "cust-1", type: "redeem" })
  })

  it("anuncia el bono sorpresa en la pantalla, sin diálogo que despachar", async () => {
    await seleccionar(3)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        event: "stamp",
        milestoneClaim: { id: "m1", label: "Postre gratis", iconName: null },
      }),
    })
    fireEvent.click(screen.getByRole("button", { name: /agregar sello/i }))

    const anuncio = await screen.findByText(/bono sorpresa: postre gratis/i, {}, { timeout: 2000 })
    expect(anuncio).toBeVisible()
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})

describe("La búsqueda dice qué falló, no que no hay nadie", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  async function buscar(respuesta: unknown) {
    fetchMock.mockResolvedValueOnce(respuesta)
    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "Ana" } })
    return screen.findByRole("alert", {}, { timeout: 2000 })
  }

  const conEstado = (status: number, body: unknown = {}) => ({
    ok: false,
    status,
    headers: new Headers({ "x-request-id": "req-99" }),
    json: async () => body,
  })

  it("una sesión caída no se anuncia como cliente inexistente", async () => {
    const aviso = await buscar(conEstado(401))
    expect(aviso).toHaveTextContent(/sesión expiró/i)
    expect(screen.queryByText(/no se encontraron clientes/i)).not.toBeInTheDocument()
  })

  it("un permiso que falta dice a quién pedirlo", async () => {
    const aviso = await buscar(conEstado(403))
    expect(aviso).toHaveTextContent(/no tiene permiso/i)
    expect(aviso).toHaveTextContent(/administrador/i)
  })

  it("un error del servidor es reintentable y enseña el requestId para soporte", async () => {
    const aviso = await buscar(
      conEstado(500, { error: "Algo falló", action: "Intenta de nuevo.", requestId: "req-99", retryable: true }),
    )
    expect(aviso).toHaveTextContent("req-99")
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument()
  })

  it("un contrato roto se reporta como tal, no como lista vacía", async () => {
    const aviso = await buscar({ ok: true, status: 200, headers: new Headers(), json: async () => ({ customers: [] }) })
    expect(aviso).toHaveTextContent(/no tiene la forma esperada/i)
  })

  it("una colección vacía sigue siendo una colección vacía", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    })
    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "Ana" } })
    expect(await screen.findByText(/no se encontraron clientes/i, {}, { timeout: 2000 })).toBeVisible()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("con más resultados de los que caben, ofrece traer el resto", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ items: [cliente(3)], page: 1, pageSize: 1, total: 4 }),
    })
    render(<ScanPage />)
    fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "Ana" } })
    expect(await screen.findByText("1 de 4 clientes", {}, { timeout: 2000 })).toBeVisible()
    expect(screen.getByRole("button", { name: /ver más resultados/i })).toBeInTheDocument()
  })
})
