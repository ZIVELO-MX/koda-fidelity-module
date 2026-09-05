// El color del negocio llega de un selector libre, así que no se inyecta crudo.
// De él se derivan los estados y el color de texto, calculado por contraste.

const ACENTO_KODA = "#FF6B35"
const TINTA = "#1C1B17"
const BLANCO = "#FFFFFF"

export type Marca = {
  base: string
  hover: string
  pressed: string
  soft: string
  ink: string
  texto: string
}

function normalizar(hex: string): string | null {
  const limpio = hex.trim().replace(/^#/, "")
  if (/^[0-9a-fA-F]{3}$/.test(limpio)) {
    return "#" + limpio.split("").map((c) => c + c).join("").toUpperCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(limpio)) return "#" + limpio.toUpperCase()
  return null
}

function canales(hex: string): [number, number, number] {
  const n = hex.slice(1)
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number]
}

function aHex(c: number[]): string {
  return "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase()
}

function canalLineal(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function luminancia(hex: string): number {
  const [r, g, b] = canales(hex)
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b)
}

export function contraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la]
  return (alto + 0.05) / (bajo + 0.05)
}

function mezclar(hex: string, destino: number, p: number): string {
  return aHex(canales(hex).map((c) => c + (destino - c) * p))
}

export function derivarMarca(entrada: string): Marca {
  const hex = normalizar(entrada) ?? ACENTO_KODA

  // Un color casi blanco o casi negro se acerca al rango usable, para que el
  // foco y los botones sigan viéndose.
  let base = hex
  const l = luminancia(hex)
  if (l > 0.75) base = mezclar(hex, 0, 0.35)
  else if (l < 0.03) base = mezclar(hex, 255, 0.2)

  // Un tono ya oscuro se oscurece menos: el ajuste es proporcional.
  const lb = luminancia(base)
  const paso = 0.12 + lb * 0.18

  return {
    base,
    hover: mezclar(base, 0, paso),
    pressed: mezclar(base, 0, paso * 2),
    soft: mezclar(base, 255, 0.88),
    ink: mezclar(base, 0, 0.55),
    texto: contraste(BLANCO, base) >= 4.5 ? BLANCO : TINTA,
  }
}
