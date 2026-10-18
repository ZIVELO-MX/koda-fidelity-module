import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import BrandingPage from "@/app/dashboard/(main)/branding/page"
import { SettingsClient } from "@/app/dashboard/(main)/settings/settings-client"
import QRCodesPage from "@/app/dashboard/(main)/qr-codes/page"

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }))

/**
 * Una respuesta de error de la API también se lee como JSON. Sin revisar `ok`,
 * Configuración mostraba el formulario vacío y al guardar borraba apodo,
 * dirección, teléfono y redes; Marca y Códigos QR fingían que no había datos.
 */
function servidorQueFalla() {
  global.fetch = vi.fn(async (url: string) => {
    if (String(url).startsWith("/api/customer/profile")) return { ok: true, status: 200, json: async () => ({ profile: null }) }
    return { ok: false, status: 500, json: async () => ({ error: "Internal server error", code: "KF-SYS-001" }) }
  }) as unknown as typeof fetch
}

afterEach(() => cleanup())

describe("cuando falla la carga", () => {
  it("Configuración muestra el error en vez de un formulario vacío", async () => {
    servidorQueFalla()
    render(<SettingsClient role="admin" />)
    expect(await screen.findByText("No pudimos cargar la configuración del negocio.")).toBeTruthy()
  })

  it("Marca muestra el error en vez de los valores por defecto", async () => {
    servidorQueFalla()
    render(<BrandingPage />)
    expect(await screen.findByText("No pudimos cargar los datos de tu marca.")).toBeTruthy()
  })

  it("Códigos QR muestra el error en vez de «No hay tarjetas»", async () => {
    servidorQueFalla()
    render(<QRCodesPage />)
    expect(await screen.findByText("No pudimos cargar tus tarjetas. Intenta de nuevo.")).toBeTruthy()
  })
})
