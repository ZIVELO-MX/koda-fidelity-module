import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ExpirationPicker } from "@/components/dashboard/expiration-picker"

const NOW = new Date("2026-06-05T12:00:00.000Z")

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe("ExpirationPicker", () => {
  it("renders quick options, 'Sin caducidad', and 'Elegir fecha…'", () => {
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
    expect(screen.getByRole("button", { name: "Sin caducidad" }).className).toMatch(/bg-primary/)
  })

  it("calls onChange with empty string when 'Sin caducidad' is selected", () => {
    const onChange = vi.fn()
    render(<ExpirationPicker value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "1 mes" }))
    onChange.mockClear()
    fireEvent.click(screen.getByRole("button", { name: "Sin caducidad" }))
    expect(onChange).toHaveBeenCalledWith("")
  })

  it("'3 meses' calls onChange with September 5 (calendar months, not 90 days)", () => {
    const onChange = vi.fn()
    render(<ExpirationPicker value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "3 meses" }))
    const dateArg: string = onChange.mock.calls.at(-1)?.[0]
    expect(dateArg).toBe("2026-09-05")
  })

  it("'1 año' calls onChange with next year same date", () => {
    const onChange = vi.fn()
    render(<ExpirationPicker value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "1 año" }))
    expect(onChange.mock.calls.at(-1)?.[0]).toBe("2027-06-05")
  })

  it("'6 meses' calls onChange with December 5", () => {
    const onChange = vi.fn()
    render(<ExpirationPicker value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "6 meses" }))
    expect(onChange.mock.calls.at(-1)?.[0]).toBe("2026-12-05")
  })

  it("shows formatted date label when 'Elegir fecha…' is clicked and a date is selected", () => {
    render(<ExpirationPicker value="2026-12-15" onChange={() => {}} />)
    expect(screen.getByText(/vence el/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /dic/i })).toBeInTheDocument()
  })

  it("switches to quick option mode when clicked after custom date", () => {
    const onChange = vi.fn()
    render(<ExpirationPicker value="2026-12-15" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "3 meses" }))
    expect(onChange).toHaveBeenCalledWith("2026-09-05")
  })

  it("shows formatted expiry label when value is set", () => {
    render(<ExpirationPicker value="2026-12-15" onChange={() => {}} />)
    expect(screen.getByText(/vence el/i)).toBeInTheDocument()
  })
})
