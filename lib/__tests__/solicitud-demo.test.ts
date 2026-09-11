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
