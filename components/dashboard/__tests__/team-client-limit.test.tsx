import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { TeamClient } from "../../../app/dashboard/(main)/team/team-client"
import type { Role } from "@prisma/client"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/lib/actions/auth", () => ({ logout: vi.fn() }))

type TeamUser = { id: string; email: string; name: string; role: Role; createdAt: Date }

function makeUser(id: string, role: Role = "sellador"): TeamUser {
  return { id, email: `${id}@test.com`, name: id, role, createdAt: new Date() }
}

const BASE_PROPS = {
  currentUserId: "admin-1",
  currentUserName: "Admin",
  businessName: "Mi Negocio",
  memberLimit: 3,
}

const hasText = (text: string | RegExp) => screen.queryAllByText(text).length > 0
const lacksText = (text: string | RegExp) => screen.queryAllByText(text).length === 0

describe("TeamClient — member limit UI", () => {
  afterEach(() => cleanup())

  it("shows invite button when under limit (1 member)", () => {
    render(<TeamClient {...BASE_PROPS} initialUsers={[makeUser("admin-1", "admin")]} />)
    expect(screen.getAllByRole("button", { name: /invitar/i }).length).toBeGreaterThan(0)
  })

  it("shows '1 / 3' counter when there is 1 member", () => {
    render(<TeamClient {...BASE_PROPS} initialUsers={[makeUser("admin-1", "admin")]} />)
    expect(hasText(/1 \/ 3/)).toBe(true)
  })

  it("shows '2 / 3' counter with 2 members", () => {
    render(<TeamClient {...BASE_PROPS} initialUsers={[makeUser("admin-1", "admin"), makeUser("user-2")]} />)
    expect(hasText(/2 \/ 3/)).toBe(true)
  })

  it("shows invite button when 2 members (under limit of 3)", () => {
    render(<TeamClient {...BASE_PROPS} initialUsers={[makeUser("admin-1", "admin"), makeUser("user-2")]} />)
    expect(screen.getAllByRole("button", { name: /invitar/i }).length).toBeGreaterThan(0)
  })

  it("hides invite button when at limit (3 members)", () => {
    const users = [makeUser("admin-1", "admin"), makeUser("user-2"), makeUser("user-3")]
    render(<TeamClient {...BASE_PROPS} initialUsers={users} />)
    expect(screen.queryAllByRole("button", { name: /invitar/i }).length).toBe(0)
  })

  it("shows 'Límite alcanzado' when at limit", () => {
    const users = [makeUser("admin-1", "admin"), makeUser("user-2"), makeUser("user-3")]
    render(<TeamClient {...BASE_PROPS} initialUsers={users} />)
    expect(hasText("Límite alcanzado")).toBe(true)
  })

  it("shows '3 / 3' counter at limit", () => {
    const users = [makeUser("admin-1", "admin"), makeUser("user-2"), makeUser("user-3")]
    render(<TeamClient {...BASE_PROPS} initialUsers={users} />)
    expect(hasText(/3 \/ 3/)).toBe(true)
  })
})

describe("TeamClient — self-remove protection", () => {
  afterEach(() => cleanup())

  const twoUsers = [makeUser("admin-1", "admin"), makeUser("user-2")]

  it("remove button for current user is disabled", () => {
    render(<TeamClient {...BASE_PROPS} initialUsers={twoUsers} />)
    const removeButtons = screen.getAllByRole("button", { name: /eliminar a admin-1/i })
    expect(removeButtons.every((btn) => btn.hasAttribute("disabled"))).toBe(true)
  })

  it("remove button for other user is enabled", () => {
    render(<TeamClient {...BASE_PROPS} initialUsers={twoUsers} />)
    const removeButtons = screen.getAllByRole("button", { name: /eliminar a user-2/i })
    expect(removeButtons.some((btn) => !btn.hasAttribute("disabled"))).toBe(true)
  })
})

describe("TeamClient — empty state", () => {
  afterEach(() => cleanup())

  it("shows empty state text when there are no users", () => {
    render(<TeamClient {...BASE_PROPS} initialUsers={[]} />)
    expect(hasText("Tu equipo está vacío")).toBe(true)
  })
})
