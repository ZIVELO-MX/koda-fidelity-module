import { describe, it, expect } from "vitest"
import { validarSolicitud } from "@/components/landing/solicitar-demo"

const VACIO = { nombre: "", negocio: "", giro: "", sucursales: "", contacto: "", plan: "" }

describe("validarSolicitud", () => {
  it("pide los cinco obligatorios y deja el plan opcional", () => {
    const errores = validarSolicitud(VACIO)
    expect(Object.keys(errores).sort()).toEqual(
      ["contacto", "giro", "negocio", "nombre", "sucursales"],
    )
  })

  it("acepta un correo o un teléfono de diez dígitos", () => {
    const base = { ...VACIO, nombre: "Ana", negocio: "Café", giro: "cafeteria", sucursales: "1" }
    for (const contacto of ["ana@ejemplo.com", "5512345678", "55 1234 5678", "(55) 1234-5678"]) {
      expect(validarSolicitud({ ...base, contacto }).contacto, contacto).toBeUndefined()
    }
  })

  it("rechaza un contacto que no es ninguno de los dos", () => {
    const base = { ...VACIO, nombre: "Ana", negocio: "Café", giro: "cafeteria", sucursales: "1" }
    expect(validarSolicitud({ ...base, contacto: "no soy contacto" }).contacto).toBe(
      "Ingresa un correo o teléfono válido",
    )
    expect(validarSolicitud({ ...base, contacto: "55123456" }).contacto).toBe(
      "Ingresa un correo o teléfono válido",
    )
  })

  it("un nombre de una letra no cuenta como nombre", () => {
    expect(validarSolicitud({ ...VACIO, nombre: "A" }).nombre).toBe("Ingresa tu nombre")
    expect(validarSolicitud({ ...VACIO, nombre: "  " }).nombre).toBe("Ingresa tu nombre")
  })
})

describe("contraste del formulario", () => {
  // El gris de los marcadores y del "(opcional)" iba en #8a8478, que sobre
  // blanco da 3.72 y AA pide 4.5 en texto normal. Esta prueba fija el número
  // para que no vuelva a bajar sin que nadie se entere.
  const luminancia = (hex: string) => {
    const canal = (i: number) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
  }
  const contraste = (a: string, b: string) => {
    const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
    return (alto + 0.05) / (bajo + 0.05)
  }

  it("el gris de los campos pasa AA sobre blanco", () => {
    expect(contraste("#6b6558", "#ffffff")).toBeGreaterThanOrEqual(4.5)
  })

  it("el que había antes no pasaba, y por eso se cambió", () => {
    expect(contraste("#8a8478", "#ffffff")).toBeLessThan(4.5)
  })
})
