"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site-config"

/**
 * Solicitud de demo.
 *
 * Etiqueta visible encima de cada campo. El placeholder no hace de etiqueta:
 * desaparece al escribir, y es la regla más básica de formularios además de
 * accesibilidad. Placeholder, error y foco están revisados contra el panel
 * oscuro, que es donde más se pierden.
 *
 * ponytail: no hay endpoint de solicitudes, así que el envío compone un correo
 * con lo escrito. Cuando backend exponga uno, se cambia el `submit` y los
 * campos se quedan igual.
 */

const CAMPOS = [
  { id: "nombre", etiqueta: "Nombre", tipo: "text", autoComplete: "name", placeholder: "María García" },
  { id: "negocio", etiqueta: "Negocio", tipo: "text", autoComplete: "organization", placeholder: "Café Aurora" },
  { id: "giro", etiqueta: "Giro", tipo: "text", autoComplete: "off", placeholder: "Cafetería, barbería, tienda..." },
  { id: "sucursales", etiqueta: "Sucursales", tipo: "text", autoComplete: "off", placeholder: "1" },
  { id: "contacto", etiqueta: "Contacto", tipo: "text", autoComplete: "email", placeholder: "maria@ejemplo.com" },
] as const

type Campo = (typeof CAMPOS)[number]["id"]

const CORREO_CONTACTO =
  siteConfig.footer.links.find((enlace) => enlace.href.startsWith("mailto:"))?.href.replace("mailto:", "") ??
  "contacto@zivelo.dev"

/** Un correo o un teléfono de diez dígitos. Se valida al salir del campo. */
function contactoValido(valor: string): boolean {
  const limpio = valor.trim()
  if (!limpio) return false
  if (limpio.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)
  return /^\d{10}$/.test(limpio.replace(/[\s()+-]/g, ""))
}

export function SolicitarDemo() {
  const [valores, setValores] = useState<Record<Campo, string>>({
    nombre: "",
    negocio: "",
    giro: "",
    sucursales: "",
    contacto: "",
  })
  const [errorContacto, setErrorContacto] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault()
    if (!contactoValido(valores.contacto)) {
      setErrorContacto(true)
      return
    }
    const cuerpo = CAMPOS.map((campo) => `${campo.etiqueta}: ${valores[campo.id]}`).join("\n")
    window.location.href = `mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent(
      `Solicitud de demo de ${valores.negocio || valores.nombre}`,
    )}&body=${encodeURIComponent(cuerpo)}`
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="rounded-3xl bg-[#1C1B17] p-6 text-[#FAFAF7] sm:p-10">
        <h3 className="text-xl font-semibold">Listo, abrimos tu correo</h3>
        <p className="mt-2 text-sm text-[#FAFAF7]/75">
          Si no se abrió solo, escríbenos a {CORREO_CONTACTO} y te contestamos ahí mismo.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} noValidate className="rounded-3xl bg-[#1C1B17] p-6 text-[#FAFAF7] sm:p-10">
      <h3 className="text-2xl font-bold">¿Quieres verlo en tu negocio?</h3>
      <p className="mt-2 text-sm text-[#FAFAF7]/75">
        Cuéntanos qué vendes y te enseñamos cómo quedaría tu tarjeta.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {CAMPOS.map((campo) => {
          const esContacto = campo.id === "contacto"
          return (
            <div key={campo.id} className={esContacto ? "sm:col-span-2" : undefined}>
              <label htmlFor={campo.id} className="mb-1.5 block text-sm font-medium text-[#FAFAF7]">
                {campo.etiqueta}
              </label>
              <input
                id={campo.id}
                name={campo.id}
                type={campo.tipo}
                autoComplete={campo.autoComplete}
                placeholder={campo.placeholder}
                value={valores[campo.id]}
                aria-invalid={esContacto ? errorContacto : undefined}
                aria-describedby={esContacto ? "contacto-ayuda" : undefined}
                onChange={(e) => {
                  setValores((previos) => ({ ...previos, [campo.id]: e.target.value }))
                  if (esContacto) setErrorContacto(false)
                }}
                onBlur={() => {
                  if (esContacto && valores.contacto) setErrorContacto(!contactoValido(valores.contacto))
                }}
                className="min-h-11 w-full rounded-xl border border-[#FAFAF7]/25 bg-[#FAFAF7]/5 px-3.5 text-[#FAFAF7] placeholder:text-[#FAFAF7]/55 outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-[invalid=true]:border-[#FFB4A2]"
              />
              {esContacto && (
                <p
                  id="contacto-ayuda"
                  className={errorContacto ? "mt-1.5 text-sm text-[#FFB4A2]" : "mt-1.5 text-sm text-[#FAFAF7]/75"}
                >
                  Escribe un correo o un teléfono de 10 dígitos
                </p>
              )}
            </div>
          )
        })}
      </div>

      <Button type="submit" size="lg" className="mt-8 min-h-11 w-full sm:w-auto sm:px-10">
        Solicitar demo
      </Button>
    </form>
  )
}
