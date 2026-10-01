import { nombreDeTema, pielDeTarjeta, type ColorDeTexto } from "@/lib/temas-de-tarjeta"

/**
 * Lo que pasó con el color de la tarjeta cuando el negocio fuerza el texto.
 *
 * Lo decidido es que el texto siempre se lea: si el color elegido no llega a
 * 4.5:1, el tono del fondo se ajusta lo mínimo. Sin este aviso, quien elige
 * blanco sobre ámbar ve su ámbar oscurecido y lo toma por un error. Y negro
 * sobre «Gradiente vivo» no llega nunca (su extremo baja al 50%; la tinta se
 * queda en 4.36), así que ahí el texto va en blanco y se dice.
 */
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
    ? `Con ${nombreDeTema(themeCode ?? "")} el texto va claro: oscuro no se leería.`
    : piel.tonoAjustado
      ? "Para que el texto se lea, el tono de la tarjeta se ajusta un poco."
      : null
  return aviso ? <p className="text-xs text-muted-foreground">{aviso}</p> : null
}
