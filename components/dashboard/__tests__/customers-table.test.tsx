import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { CustomersTable, type TableCustomer } from "../customers-table"

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))
vi.mock("../customer-actions-menu", () => ({
  CustomerActionsMenu: () => <div data-testid="actions-menu" />,
}))
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
}))

const BASE_PARAMS = new URLSearchParams()
const BASE_PATH = "/dashboard/customers"

function makeCustomer(overrides: Partial<TableCustomer> = {}): TableCustomer {
  return {
    id: "cust-1",
    name: "Ana García",
    stamps: 5,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    card: { name: "Café Reward", stampsRequired: 10, reward: "Café gratis", brandColor: "#f97316" },
    _count: { stampsLog: 2 },
    ...overrides,
  }
}

function renderTable(customers: TableCustomer[], props: Record<string, any> = {}) {
  return render(
    <CustomersTable
      customers={customers}
      sort="createdAt"
      order="desc"
      basePath={BASE_PATH}
      baseParams={BASE_PARAMS}
      {...props}
    />
  )
}

describe("CustomersTable", () => {
  afterEach(() => cleanup())

  it("renders customer name", () => {
    renderTable([makeCustomer()])
    expect(screen.getByText("Ana García")).toBeInTheDocument()
  })

  it("renders stamp progress fraction", () => {
    renderTable([makeCustomer({ stamps: 5 })])
    expect(screen.getByText("5/10")).toBeInTheDocument()
  })

  it("renders redeem count", () => {
    renderTable([makeCustomer({ _count: { stampsLog: 3 } })])
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("shows 'Listo' badge when stamps >= stampsRequired", () => {
    renderTable([makeCustomer({ stamps: 10 })])
    expect(screen.getByText("Listo")).toBeInTheDocument()
  })

  it("does not show 'Listo' badge when stamps < stampsRequired", () => {
    renderTable([makeCustomer({ stamps: 4 })])
    expect(screen.queryByText("Listo")).not.toBeInTheDocument()
  })

  describe("card column visibility", () => {
    it("shows Tarjeta column by default (showCardColumn=true)", () => {
      renderTable([makeCustomer()])
      expect(screen.getByText("Tarjeta")).toBeInTheDocument()
      expect(screen.getByText("Café Reward")).toBeInTheDocument()
    })

    it("hides Tarjeta column when showCardColumn=false", () => {
      renderTable([makeCustomer()], { showCardColumn: false })
      expect(screen.queryByText("Tarjeta")).not.toBeInTheDocument()
      expect(screen.queryByText("Café Reward")).not.toBeInTheDocument()
    })
  })

  describe("footer", () => {
    it("shows singular count for 1 customer", () => {
      renderTable([makeCustomer()])
      expect(screen.getByText("1 cliente")).toBeInTheDocument()
    })

    it("shows plural count for multiple customers", () => {
      renderTable([makeCustomer({ id: "c1" }), makeCustomer({ id: "c2", name: "Luis" })])
      expect(screen.getByText("2 clientes")).toBeInTheDocument()
    })

    it("appends footerSuffix to footer text", () => {
      renderTable([makeCustomer()], { footerSuffix: ' en "Café Reward"' })
      expect(screen.getByText(/en "Café Reward"/)).toBeInTheDocument()
    })
  })

  describe("sortable column headers", () => {
    it("renders Cliente as a sortable link", () => {
      renderTable([makeCustomer()])
      const link = screen.getByRole("link", { name: /cliente/i })
      expect(link.getAttribute("href")).toContain("sort=name")
    })

    it("renders Progreso as a sortable link", () => {
      renderTable([makeCustomer()])
      const link = screen.getByRole("link", { name: /progreso/i })
      expect(link.getAttribute("href")).toContain("sort=stamps")
    })

    it("renders Registro as a sortable link", () => {
      renderTable([makeCustomer()])
      const link = screen.getByRole("link", { name: /registro/i })
      expect(link.getAttribute("href")).toContain("sort=createdAt")
    })

    it("Canjes column is not a sortable link", () => {
      renderTable([makeCustomer()])
      expect(screen.getByText("Canjes").closest("a")).toBeNull()
    })
  })

  it("renders an empty table body when customers is empty", () => {
    renderTable([])
    expect(screen.queryByText("Ana García")).not.toBeInTheDocument()
    expect(screen.getByText("0 clientes")).toBeInTheDocument()
  })
})
