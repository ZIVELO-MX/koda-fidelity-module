import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { TeamClient } from "../../../app/dashboard/(main)/team/team-client"
import type { Role } from "@prisma/client"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/lib/actions/auth", () => ({ logout: vi.fn() }))

// El contrato de invitación es uno solo: el backend no crea la cuenta ni
// devuelve contraseña, manda un enlace de un uso por correo y responde 202 con
// la invitación. Lo que se prueba aquí es que la pantalla no anuncie un envío
// que no puede confirmar, y que no enseñe una credencial aunque alguna
// respuesta vieja se la mande.

const BASE_PROPS = {
  currentUserId: "admin-1",
  currentUserName: "Admin",
  businessName: "Mi Negocio",
  memberLimit: 3,
  initialUsers: [
    { id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as Role, createdAt: new Date() },
  ],
}

function responder(cuerpo: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => cuerpo,
  }))
}

async function invitar() {
  fireEvent.click(screen.getAllByRole("button", { name: /invitar/i })[0])
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "María" } })
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "maria@test.com" } })
  fireEvent.click(screen.getByRole("button", { name: /Crear cuenta/i }))
}

describe("TeamClient, resultado de la invitación", () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("si llega una contraseña temporal, no se enseña: ese contrato se retiró", async () => {
    responder({ user: { id: "u2", email: "maria@test.com", name: "María", role: "sellador", createdAt: new Date() }, temporaryPassword: "abc12345" })
    render(<TeamClient {...BASE_PROPS} />)
    await invitar()

    await waitFor(() => expect(screen.getByText("Invitación enviada")).toBeTruthy())
    expect(screen.queryByText("abc12345")).toBeNull()
    expect(screen.queryByRole("button", { name: /Compartir invitación/i })).toBeNull()
  })

  it("un 2xx de forma desconocida no se anuncia como enviado", async () => {
    responder({ ok: true })
    render(<TeamClient {...BASE_PROPS} />)
    await invitar()

    await waitFor(() => expect(screen.getByText(/no reconocemos/i)).toBeTruthy())
    expect(screen.queryByText("Invitación enviada")).toBeNull()
  })

  it("con enlace de un uso dice que se envió y no inventa una contraseña", async () => {
    responder({ invitation: { email: "maria@test.com", expiresAt: "2026-09-16T10:00:00.000Z" } }, 202)
    render(<TeamClient {...BASE_PROPS} />)
    await invitar()

    await waitFor(() => expect(screen.getByText("Invitación enviada")).toBeTruthy())
    expect(screen.queryByText("Contraseña temporal")).toBeNull()
    expect(screen.queryByRole("button", { name: /Compartir invitación/i })).toBeNull()
    expect(screen.getByText(/El enlace caduca el 16 de septiembre/)).toBeTruthy()
  })

  it("con enlace de un uso no añade a la lista a quien todavía no aceptó", async () => {
    responder({ invitation: { email: "maria@test.com", expiresAt: "2026-09-16T10:00:00.000Z" } }, 202)
    render(<TeamClient {...BASE_PROPS} />)
    await invitar()

    await waitFor(() => expect(screen.getByText("Invitación enviada")).toBeTruthy())
    // Sigue habiendo una sola persona: María entra cuando use el enlace.
    expect(screen.getAllByText(/1 \/ 3/).length).toBeGreaterThan(0)
  })
})

describe("TeamClient, los rechazos se dicen", () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  const CON_DOS = {
    ...BASE_PROPS,
    initialUsers: [
      ...BASE_PROPS.initialUsers,
      { id: "u2", email: "maria@test.com", name: "María", role: "sellador" as Role, createdAt: new Date() },
    ],
  }

  it("al eliminar, un rechazo del servidor se ve y no se finge que se eliminó", async () => {
    responder({ error: "No puedes quedarte sin administradores.", action: "Nombra a otro antes de eliminar a este." }, 409)
    render(<TeamClient {...CON_DOS} />)

    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar a María" })[0])
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar" }))

    const aviso = await screen.findByRole("alert")
    expect(aviso).toHaveTextContent(/sin administradores/i)
    expect(aviso).toHaveTextContent(/nombra a otro/i)
    expect(screen.getByText("María")).toBeTruthy()
  })
})
