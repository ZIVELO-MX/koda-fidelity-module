import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react"
import BrandingPage from "@/app/dashboard/(main)/branding/page"

vi.mock("@/components/dashboard/icon-picker", () => ({
  IconPicker: () => <div data-testid="icon-picker" />,
}))

vi.mock("@/lib/card-icons", () => ({
  getCardIcon: () => null,
}))

const MOCK_BUSINESS = {
  name: "Test Negocio",
  brandColor: "#f97316",
  logoUrl: null,
  iconName: null,
}

function makeFile(sizeBytes: number, name = "logo.png") {
  const file = new File([""], name, { type: "image/png" })
  Object.defineProperty(file, "size", { value: sizeBytes })
  return file
}

function triggerFileInput(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ business: MOCK_BUSINESS }),
  }) as unknown as typeof fetch
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("BrandingPage — logo upload", () => {
  it("renders the logo upload section after loading", async () => {
    render(<BrandingPage />)
    await waitFor(() =>
      expect(screen.getByText("Logo del Negocio")).toBeInTheDocument()
    )
    expect(screen.getByRole("button", { name: /subir logo/i })).toBeInTheDocument()
  })

  it("shows error when file exceeds 2 MB", async () => {
    render(<BrandingPage />)
    await waitFor(() => screen.getByText("Logo del Negocio"))

    triggerFileInput(makeFile(3 * 1024 * 1024)) // 3 MB

    expect(screen.getByText(/demasiado grande/i)).toBeInTheDocument()
    expect(screen.getByText(/máximo permitido es 2 MB/i)).toBeInTheDocument()
  })

  it("does not show error for file exactly at 2 MB limit", async () => {
    render(<BrandingPage />)
    await waitFor(() => screen.getByText("Logo del Negocio"))

    triggerFileInput(makeFile(2 * 1024 * 1024)) // exactly 2 MB

    expect(screen.queryByText(/demasiado grande/i)).toBeNull()
  })

  it("does not show error for file under 2 MB", async () => {
    render(<BrandingPage />)
    await waitFor(() => screen.getByText("Logo del Negocio"))

    triggerFileInput(makeFile(500 * 1024)) // 500 KB

    expect(screen.queryByText(/demasiado grande/i)).toBeNull()
  })

  it("clears error when a valid file is selected after a rejected one", async () => {
    render(<BrandingPage />)
    await waitFor(() => screen.getByText("Logo del Negocio"))

    triggerFileInput(makeFile(5 * 1024 * 1024)) // 5 MB — rejected
    expect(screen.getByText(/demasiado grande/i)).toBeInTheDocument()

    triggerFileInput(makeFile(300 * 1024)) // 300 KB — accepted
    expect(screen.queryByText(/demasiado grande/i)).toBeNull()
  })

  it("shows error loading state on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch
    render(<BrandingPage />)
    await waitFor(() =>
      expect(screen.getByText(/error al cargar/i)).toBeInTheDocument()
    )
  })
})
