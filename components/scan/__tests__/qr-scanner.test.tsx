import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, act } from "@testing-library/react"
import { QRScanner } from "../qr-scanner"
import type { IDetectedBarcode, IScannerError } from "@yudiel/react-qr-scanner"

vi.mock("@yudiel/react-qr-scanner", () => ({
  Scanner: vi.fn((props) => {
    ;(window as any).__scannerProps = props
    return <div data-testid="scanner" />
  }),
}))

const scannerProps = () => (window as any).__scannerProps as {
  onScan: (codes: IDetectedBarcode[]) => void
  onError?: (error: IScannerError) => void
  paused: boolean
  formats: string[]
  components: Record<string, unknown>
  allowMultiple: boolean
} | null

beforeEach(() => {
  delete (window as any).__scannerProps
})

describe("QRScanner", () => {
  it("renderiza el Scanner con las props correctas", () => {
    render(<QRScanner onScan={() => {}} />)
    const props = scannerProps()
    expect(props).not.toBeNull()
    expect(props!.formats).toEqual(["qr_code"])
    expect(props!.components).toEqual({ finder: true })
    expect(props!.allowMultiple).toBe(false)
    expect(props!.paused).toBe(false)
  })

  it("llama a onScan con el rawValue cuando se detecta un código", () => {
    const onScan = vi.fn()
    render(<QRScanner onScan={onScan} />)
    const props = scannerProps()!
    const code: IDetectedBarcode = {
      rawValue: "cust-123",
      format: "qr_code",
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      cornerPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    }
    act(() => props.onScan([code]))
    expect(onScan).toHaveBeenCalledWith("cust-123")
  })

  it("pausa el scanner después de un scan exitoso", () => {
    const onScan = vi.fn()
    render(<QRScanner onScan={onScan} />)
    let props = scannerProps()!
    expect(props.paused).toBe(false)
    const code: IDetectedBarcode = {
      rawValue: "cust-123",
      format: "qr_code",
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      cornerPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    }
    act(() => props.onScan([code]))
    props = scannerProps()!
    expect(props.paused).toBe(true)
  })

  it("trimea espacios del rawValue antes de llamar onScan", () => {
    const onScan = vi.fn()
    render(<QRScanner onScan={onScan} />)
    const props = scannerProps()!
    const code: IDetectedBarcode = {
      rawValue: "  cust-123  ",
      format: "qr_code",
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      cornerPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    }
    act(() => props.onScan([code]))
    expect(onScan).toHaveBeenCalledWith("cust-123")
  })

  it("ignora onScan si el rawValue está vacío después de trim", () => {
    const onScan = vi.fn()
    render(<QRScanner onScan={onScan} />)
    const props = scannerProps()!
    const code: IDetectedBarcode = {
      rawValue: "   ",
      format: "qr_code",
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      cornerPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    }
    act(() => props.onScan([code]))
    expect(onScan).not.toHaveBeenCalled()
  })

  it("ignora onScan si el array está vacío", () => {
    const onScan = vi.fn()
    render(<QRScanner onScan={onScan} />)
    const props = scannerProps()!
    act(() => props.onScan([]))
    expect(onScan).not.toHaveBeenCalled()
  })

  it("traduce permission-denied a español", () => {
    const onError = vi.fn()
    render(<QRScanner onScan={() => {}} onError={onError} />)
    const props = scannerProps()!
    act(() => props.onError!({ kind: "permission-denied", message: "denied", cause: null }))
    expect(onError).toHaveBeenCalledWith("Permiso de cámara denegado")
  })

  it("traduce no-camera a español", () => {
    const onError = vi.fn()
    render(<QRScanner onScan={() => {}} onError={onError} />)
    const props = scannerProps()!
    act(() => props.onError!({ kind: "no-camera", message: "no cam", cause: null }))
    expect(onError).toHaveBeenCalledWith("No se detectó ninguna cámara")
  })

  it("traduce in-use a español", () => {
    const onError = vi.fn()
    render(<QRScanner onScan={() => {}} onError={onError} />)
    const props = scannerProps()!
    act(() => props.onError!({ kind: "in-use", message: "in use", cause: null }))
    expect(onError).toHaveBeenCalledWith("La cámara está siendo usada por otra aplicación")
  })

  it("traduce insecure-context a español", () => {
    const onError = vi.fn()
    render(<QRScanner onScan={() => {}} onError={onError} />)
    const props = scannerProps()!
    act(() => props.onError!({ kind: "insecure-context", message: "no https", cause: null }))
    expect(onError).toHaveBeenCalledWith("Se requiere HTTPS para acceder a la cámara")
  })

  it("traduce unsupported a español", () => {
    const onError = vi.fn()
    render(<QRScanner onScan={() => {}} onError={onError} />)
    const props = scannerProps()!
    act(() => props.onError!({ kind: "unsupported", message: "unsupported", cause: null }))
    expect(onError).toHaveBeenCalledWith("Escáner no soportado en este navegador")
  })

  it("usa el mensaje original si el kind no está mapeado", () => {
    const onError = vi.fn()
    render(<QRScanner onScan={() => {}} onError={onError} />)
    const props = scannerProps()!
    act(() => props.onError!({ kind: "security" as any, message: "security error", cause: null }))
    expect(onError).toHaveBeenCalledWith("security error")
  })

  it("usa mensaje genérico si no hay kind ni message", () => {
    const onError = vi.fn()
    render(<QRScanner onScan={() => {}} onError={onError} />)
    const props = scannerProps()!
    act(() => props.onError!({
      kind: "unknown",
      message: "",
      cause: null,
    } as IScannerError))
    expect(onError).toHaveBeenCalledWith("Error al acceder a la cámara")
  })

  it("no explota si onError no está definido", () => {
    render(<QRScanner onScan={() => {}} />)
    const props = scannerProps()!
    expect(() => {
      act(() => props.onError!({ kind: "unknown", message: "err", cause: null }))
    }).not.toThrow()
  })

  it("renderiza el contenedor con clases de Tailwind", () => {
    const { container } = render(<QRScanner onScan={() => {}} />)
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv).toHaveClass("aspect-square")
    expect(outerDiv).toHaveClass("rounded-3xl")
    expect(outerDiv).toHaveClass("bg-muted")
  })
})
