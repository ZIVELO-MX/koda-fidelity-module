import { describe, it, expect } from "vitest"

interface Manifest {
  name: string
  short_name: string
  description: string
  start_url: string
  display: string
  background_color: string
  theme_color: string
  icons: Array<{ src: string; sizes: string; type: string }>
}

function validateManifest(m: Manifest): void {
  if (!m.name || !m.short_name) throw new Error("name and short_name are required")
  if (!m.start_url) throw new Error("start_url is required")
  if (!["standalone", "fullscreen", "minimal-ui", "browser"].includes(m.display)) {
    throw new Error("display must be a valid display mode")
  }
  if (!m.icons || m.icons.length === 0) throw new Error("at least one icon is required")
  if (!/^#[0-9a-fA-F]{6}$/.test(m.theme_color)) throw new Error("theme_color must be a valid hex")
  if (!/^#[0-9a-fA-F]{6}$/.test(m.background_color)) throw new Error("background_color must be a valid hex")
}

const manifest: Manifest = {
  name: "Koda Fidelity",
  short_name: "Koda",
  description: "Tarjetas de fidelidad digitales para tu negocio",
  start_url: "/dashboard",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#f97316",
  icons: [
    { src: "/icon-light-32x32.png", sizes: "32x32", type: "image/png" },
    { src: "/icon-dark-32x32.png", sizes: "32x32", type: "image/png" },
    { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  ],
}

describe("PWA manifest validation", () => {
  it("has required fields", () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.description).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.display).toBeTruthy()
  })

  it("has valid display mode", () => {
    expect(["standalone", "fullscreen", "minimal-ui", "browser"]).toContain(manifest.display)
  })

  it("has valid theme and background colors", () => {
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it("has at least one icon", () => {
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  it("has valid icon entries", () => {
    manifest.icons.forEach((icon) => {
      expect(icon.src).toBeTruthy()
      expect(icon.sizes).toBeTruthy()
      expect(icon.type).toBe("image/png")
    })
  })

  it("passes full validation", () => {
    expect(() => validateManifest(manifest)).not.toThrow()
  })
})
