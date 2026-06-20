import QRCode from "qrcode"

export const PDF_SIZES = {
  "tarjeta": { width: 306, height: 468, label: "Tarjeta" },
  "media-carta": { width: 396, height: 612, label: "Media Carta" },
  "carta": { width: 612, height: 792, label: "Carta" },
} as const

export type PdfSizeKey = keyof typeof PDF_SIZES

export async function generateQRDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    width: 400,
    margin: 1,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  })
}

export function formatPdfSizeLabel(key: PdfSizeKey): string {
  return PDF_SIZES[key].label
}
