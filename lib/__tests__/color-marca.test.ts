import { describe, expect, it } from "vitest"
import { contraste, derivarMarca } from "../color-marca"

describe("derivarMarca", () => {
  // El design system fija la regla: el texto sobre la marca se calcula por
  // contraste y nunca se fija a blanco. El acento de KODA deja el blanco en
  // 2.84:1, por debajo de 4.5:1, así que le corresponde tinta.
  it("usa tinta oscura sobre el acento de KODA, donde el blanco no llega a 4.5:1", () => {
    expect(derivarMarca("#FF6B35").texto).toBe("#1C1B17")
  })

  it("usa blanco sobre un color oscuro, donde sí alcanza el mínimo", () => {
    expect(derivarMarca("#0369A1").texto).toBe("#FFFFFF")
  })

  it("usa tinta oscura sobre un amarillo, donde el blanco sería ilegible", () => {
    expect(derivarMarca("#FFFF00").texto).toBe("#1C1B17")
  })

  it("aclara el estado hover menos cuando el color ya es oscuro", () => {
    const claro = derivarMarca("#FF6B35")
    const oscuro = derivarMarca("#1A1A1A")
    expect(claro.hover).not.toBe(claro.base)
    expect(oscuro.hover).not.toBe(oscuro.base)
  })

  it("acerca al rango usable un color casi blanco", () => {
    expect(derivarMarca("#FFFFFF").base).not.toBe("#FFFFFF")
  })

  it("acerca al rango usable un color casi negro", () => {
    expect(derivarMarca("#000000").base).not.toBe("#000000")
  })

  it("acerca al rango usable un pastel muy claro", () => {
    expect(derivarMarca("#FDEBD3").base).not.toBe("#FDEBD3")
  })

  it("deriva un gris sin romperse", () => {
    const gris = derivarMarca("#808080")
    expect(gris.base).toBe("#808080")
    expect(gris.hover).not.toBe(gris.base)
  })

  it("acepta la forma corta de tres dígitos", () => {
    expect(derivarMarca("#f63").base).toBe("#FF6633")
  })

  it("devuelve el acento de KODA cuando el valor es inválido", () => {
    expect(derivarMarca("no es un color").base).toBe("#FF6B35")
  })

  it("deja la tinta legible sobre su propio fondo suave", () => {
    for (const entrada of ["#FF6B35", "#FFFF00", "#0369A1", "#808080", "#000000"]) {
      const marca = derivarMarca(entrada)
      expect(contraste(marca.ink, marca.soft)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
