import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { TeamClient } from "../../../app/dashboard/(main)/team/team-client"
import type { Role } from "@prisma/client"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/lib/actions/auth", () => ({ logout: vi.fn() }))

// La pantalla tiene que hablar los dos contratos de invitación: el de esta rama,
// que devuelve una contraseña temporal, y el del backend 1.2.0, que ya no la
// crea y manda un enlace de un uso por correo. Las ramas avanzan sin esperarse,
// así que el día del merge esto no puede quedarse mudo ni enseñar una
// contraseña que ya no existe.

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

  it("con contraseña temporal enseña las credenciales y la acción de compartir", async () => {
    responder({ user: { id: "u2", email: "maria@test.com", name: "María", role: "sellador", createdAt: new Date() }, temporaryPassword: "abc12345" })
    render(<TeamClient {...BASE_PROPS} />)
    await invitar()

    await waitFor(() => expect(screen.getByText("Cuenta creada")).toBeTruthy())
    expect(screen.getByText("abc12345")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Compartir invitación/i })).toBeTruthy()
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
