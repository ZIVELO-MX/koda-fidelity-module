import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ExpirationPicker } from "@/components/dashboard/expiration-picker"

const NOW = new Date("2026-06-05T12:00:00.000Z")

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe("ExpirationPicker", () => {
  it("renders all quick options and 'Sin caducidad'", () => {
    render(<ExpirationPicker value="" onChange={() => {}} />)
    expect(screen.getByRole("button", { name: "1 semana" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "1 mes" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "3 meses" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "6 meses" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "1 año" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sin caducidad" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Elegir fecha…" })).toBeInTheDocument()
  })

  it("starts with 'Sin caducidad' active when value is empty", () => {
    render(<ExpirationPicker value="" onChange={() => {}} />)
    const btn = screen.getByRole("button", { name: "Sin caducidad" })
    expect(btn.className).toMatch(/bg-primary/)
  })

  it("calls onChange with empty string when 'Sin caducidad' is selected", () => {
    const onChange = vi.fn()
    render(<ExpirationPicker value="2026-12-01" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "1 semana" }))
    fireEvent.click(screen.getByRole("button", { name: "Sin caducidad" }))
    expect(onChange).toHaveBeenCalledWith("")
  })

  it("calls onChange with computed date when a quick option is clicked", () => {
    const onChange = vi.fn()
    render(<ExpirationPicker value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "1 mes" }))
    expect(onChange).toHaveBeenCalled()
    const dateArg: string = onChange.mock.calls.at(-1)?.[0]
    expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const result = new Date(dateArg)
    const expected = new Date(NOW)
    expected.setDate(expected.getDate() + 30)
    expect(result.getFullYear()).toBe(expected.getFullYear())
    expect(result.getMonth()).toBe(expected.getMonth())
    expect(result.getDate()).toBe(expected.getDate())
  })

  it("shows date input when 'Elegir fecha…' is clicked", () => {
    render(<ExpirationPicker value="" onChange={() => {}} />)
    expect(screen.queryByTestId("expiration-date-input")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Elegir fecha…" }))
    expect(screen.getByTestId("expiration-date-input")).toBeInTheDocument()
  })

  it("hides date input when a quick option is selected after custom", () => {
    render(<ExpirationPicker value="" onChange={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: "Elegir fecha…" }))
    expect(screen.getByTestId("expiration-date-input")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "3 meses" }))
    expect(screen.queryByTestId("expiration-date-input")).toBeNull()
  })

  it("shows formatted expiry date label when a quick option is active", () => {
    const onChange = vi.fn()
    render(<ExpirationPicker value="2026-12-15" onChange={onChange} />)
    expect(screen.getByText(/vence el/i)).toBeInTheDocument()
  })
})
