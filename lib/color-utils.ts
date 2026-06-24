export function isLight(hex: string): boolean {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = num >> 16
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  return (r * 299 + g * 587 + b * 114) / 1000 > 155
}

export function cardTextColor(brandColor: string): string {
  return isLight(brandColor) ? "#1a1a1a" : "#ffffff"
}
