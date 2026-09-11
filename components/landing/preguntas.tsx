import { Plus } from "lucide-react"

/**
 * Acordeón nativo con `details` y `summary`. Es accesible por construcción, se
 * abre sin JavaScript y no necesita librería.
 *
 * La primera abre por defecto: enseña que el acordeón se abre y responde la
 * duda más común sin pedir un clic. El ícono gira 45 grados al abrir, y el foco
 * se pinta explícitamente porque el que hereda el navegador se pierde sobre el
 * fondo claro.
 */
const PREGUNTAS = [
  {
    pregunta: "¿Mi cliente necesita instalar algo?",
    respuesta:
      "No. Escanea el código con la cámara de su teléfono y su tarjeta se abre en el navegador. No hay aplicación que bajar ni contraseña que recordar.",
  },
  {
    pregunta: "¿Cómo se une alguien a mi tarjeta?",
    respuesta:
      "Escaneando el código QR que imprimes y pones en tu local, o abriendo el enlace que puedes mandar por mensaje. Solo deja su nombre y su correo.",
  },
  {
    pregunta: "¿Y si mi cliente cambia de teléfono?",
    respuesta:
      "Su tarjeta y sus sellos viven en su cuenta, no en el aparato. Entra desde el teléfono nuevo con el mismo correo y sigue donde estaba.",
  },
  {
    pregunta: "¿Necesito una terminal o un lector especial?",
    respuesta:
      "No. Sellas desde el escáner del panel, con la cámara del teléfono o de la tableta que ya tengas.",
  },
  {
    pregunta: "¿Puedo cambiar el diseño después de repartir los códigos?",
    respuesta:
      "Sí. El código impreso sigue sirviendo: apunta a la tarjeta, no al diseño. Cambias los colores o el logo y la tarjeta de todos cambia.",
  },
  {
    pregunta: "¿Cuánto cuesta?",
    respuesta:
      "Lite son 149 pesos al mes o 1,490 al año, y Pro 299 al mes o 2,990 al año. Crear tu cuenta y diseñar tu tarjeta no cuesta: el plan se contrata cuando la publicas.",
  },
]

export function Preguntas() {
  return (
    <div className="mx-auto max-w-2xl divide-y divide-border border-y border-border">
      {PREGUNTAS.map((entrada, i) => (
        <details key={entrada.pregunta} open={i === 0} className="group py-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-3 text-left font-medium text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            {entrada.pregunta}
            <Plus
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
              aria-hidden="true"
            />
          </summary>
          <p className="pb-4 pr-8 text-muted-foreground leading-relaxed">{entrada.respuesta}</p>
        </details>
      ))}
    </div>
  )
}
