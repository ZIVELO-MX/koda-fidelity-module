import { nombreDeTema, pielDeTarjeta, type ColorDeTexto } from "@/lib/temas-de-tarjeta"

/** Informa si el color de texto elegido queda por debajo del contraste AA. */
export function AvisoDeColorDeTexto({
  brandColor,
  themeCode,
  textColor,
}: {
  brandColor: string
  themeCode: string | null
  textColor: ColorDeTexto
}) {
  if (textColor === "AUTO") return null
  const piel = pielDeTarjeta(themeCode, brandColor, textColor)
  const aviso = !piel.colorDeTextoRespetado
    ? `El texto ${textColor === "LIGHT" ? "claro" : "oscuro"} puede tener poco contraste${themeCode ? ` con ${nombreDeTema(themeCode)}` : ""}.`
    : null
  return aviso ? <p className="text-xs text-muted-foreground">{aviso}</p> : null
}
