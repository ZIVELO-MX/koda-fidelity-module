"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site-config"

/**
 * Solicitud de demo, según el diseño aprobado.
 *
 * Los ids y el orden de los seis campos son los del prototipo
 * (`lp-form-nombre`, `-negocio`, `-giro`, `-sucursales`, `-contacto`, `-plan`).
 * Cambiarlos rompe analítica y autocompletado, así que se conservan tal cual.
 *
 * Etiqueta visible encima de cada campo: el placeholder desaparece al escribir
 * y no puede hacer de etiqueta. La validación corre al salir del campo, y al
 * enviar con errores el foco salta al primero que falta.
 *
 * ponytail: no hay endpoint de solicitudes, así que el envío compone un correo
 * con lo escrito. Por eso la confirmación no promete una respuesta en 24 horas
 * como el prototipo: hasta que el correo salga de verdad, eso no se sostiene.
 * Cuando backend exponga el endpoint se cambia el envío y su copy.
 */

const GIROS = [
  { valor: "cafeteria", etiqueta: "Cafetería" },
  { valor: "restaurante", etiqueta: "Restaurante o taquería" },
  { valor: "barberia", etiqueta: "Barbería o salón" },
  { valor: "gimnasio", etiqueta: "Gimnasio" },
  { valor: "panaderia", etiqueta: "Panadería o pastelería" },
  { valor: "otro", etiqueta: "Otro" },
]

const SUCURSALES = [
  { valor: "1", etiqueta: "1 sucursal" },
  { valor: "2-5", etiqueta: "2 a 5 sucursales" },
  { valor: "6-15", etiqueta: "6 a 15 sucursales" },
  { valor: "16+", etiqueta: "Más de 15" },
]

// Lite y Pro son los planes confirmados del ciclo. El prototipo listaba
// Gratis, Pro y Business, que es anterior a esa decisión.
const PLANES = ["Lite", "Pro"]

type Campo = "nombre" | "negocio" | "giro" | "sucursales" | "contacto" | "plan"

const ORDEN: Campo[] = ["nombre", "negocio", "giro", "sucursales", "contacto"]

const CORREO_CONTACTO =
  siteConfig.footer.links
    .find((enlace) => enlace.href.startsWith("mailto:"))
    ?.href.replace("mailto:", "") ?? "contacto@zivelo.dev"

export function validarSolicitud(valores: Record<Campo, string>): Partial<Record<Campo, string>> {
  const errores: Partial<Record<Campo, string>> = {}
  if (valores.nombre.trim().length < 2) errores.nombre = "Ingresa tu nombre"
  if (!valores.negocio.trim()) errores.negocio = "Ingresa el nombre de tu negocio"
  if (!valores.giro) errores.giro = "Selecciona un giro"
  if (!valores.sucursales) errores.sucursales = "Selecciona una opción"

  const contacto = valores.contacto.trim()
  const esCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contacto)
  const digitos = contacto.replace(/\D/g, "")
  if (!contacto) errores.contacto = "Ingresa tu correo o WhatsApp"
  else if (!esCorreo && digitos.length < 10) errores.contacto = "Ingresa un correo o teléfono válido"

  return errores
}

const CLASE_CAMPO =
  "min-h-11 w-full rounded-xl border bg-white px-3.5 text-[#17130f] outline-none transition-colors placeholder:text-[#8a8478] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

export function SolicitarDemo() {
  const [valores, setValores] = useState<Record<Campo, string>>({
    nombre: "", negocio: "", giro: "", sucursales: "", contacto: "", plan: "",
  })
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({})
  const [enviado, setEnviado] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  const errores = validarSolicitud(valores)
  const errorDe = (campo: Campo) => (tocados[campo] ? errores[campo] : undefined)

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault()
    if (Object.keys(errores).length > 0) {
      setTocados({ nombre: true, negocio: true, giro: true, sucursales: true, contacto: true })
      const primero = ORDEN.find((campo) => errores[campo])
      if (primero) formulario.current?.querySelector<HTMLElement>(`#lp-form-${primero}`)?.focus()
      return
    }
    const cuerpo = [
      `Nombre: ${valores.nombre}`,
      `Negocio: ${valores.negocio}`,
      `Giro: ${GIROS.find((g) => g.valor === valores.giro)?.etiqueta ?? valores.giro}`,
      `Sucursales: ${SUCURSALES.find((s) => s.valor === valores.sucursales)?.etiqueta ?? valores.sucursales}`,
      `Contacto: ${valores.contacto}`,
      `Plan de interés: ${valores.plan || "sin decidir"}`,
    ].join("\n")
    // `assign` y no `location.href =`: el compilador de React no deja asignar
    // sobre ese valor.
    window.location.assign(
      `mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent(
        `Solicitud de demo de ${valores.negocio}`,
      )}&body=${encodeURIComponent(cuerpo)}`,
    )
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center sm:p-11">
        <h3 className="text-2xl font-bold text-[#17130f]">
          Listo, {valores.nombre.trim().split(" ")[0] || "ya casi"}
        </h3>
        <p className="mx-auto mt-3 max-w-xs text-[#736a5d] leading-relaxed">
          Abrimos tu correo con la solicitud. Mándalo y te contestamos a {valores.contacto}. Si no
          se abrió solo, escríbenos a {CORREO_CONTACTO}.
        </p>
        <Button
          variant="outline"
          className="mt-6 min-h-11"
          onClick={() => {
            setEnviado(false)
            setValores({ nombre: "", negocio: "", giro: "", sucursales: "", contacto: "", plan: valores.plan })
            setTocados({})
          }}
        >
          Enviar otra solicitud
        </Button>
      </div>
    )
  }

  return (
    <form ref={formulario} onSubmit={enviar} noValidate className="rounded-2xl bg-white p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Texto id="nombre" etiqueta="Nombre completo" placeholder="Tu nombre" autoComplete="name"
          valores={valores} setValores={setValores} setTocados={setTocados} error={errorDe("nombre")} />
        <Texto id="negocio" etiqueta="Negocio" placeholder="Nombre de tu negocio" autoComplete="organization"
          valores={valores} setValores={setValores} setTocados={setTocados} error={errorDe("negocio")} />
        <Lista id="giro" etiqueta="Giro de negocio" opciones={GIROS}
          valores={valores} setValores={setValores} setTocados={setTocados} error={errorDe("giro")} />
        <Lista id="sucursales" etiqueta="Sucursales" opciones={SUCURSALES}
          valores={valores} setValores={setValores} setTocados={setTocados} error={errorDe("sucursales")} />
        <div className="sm:col-span-2">
          <Texto id="contacto" etiqueta="Correo o WhatsApp" placeholder="tu@correo.com o 55 1234 5678"
            autoComplete="email" valores={valores} setValores={setValores} setTocados={setTocados}
            error={errorDe("contacto")} />
        </div>
        <div className="sm:col-span-2">
          <Lista id="plan" etiqueta="Plan de interés" opcional
            opciones={PLANES.map((p) => ({ valor: p, etiqueta: p }))}
            vacio="No estoy seguro, quiero una recomendación"
            valores={valores} setValores={setValores} setTocados={setTocados} />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-6 min-h-11 w-full">
        Solicitar demo
      </Button>
      <p className="mt-3 text-center text-xs text-[#736a5d]">
        No compartimos tus datos. Al enviar aceptas nuestra política de privacidad.
      </p>
    </form>
  )
}

type ComunProps = {
  id: Campo
  etiqueta: string
  error?: string
  valores: Record<Campo, string>
  setValores: React.Dispatch<React.SetStateAction<Record<Campo, string>>>
  setTocados: React.Dispatch<React.SetStateAction<Partial<Record<Campo, boolean>>>>
}

function Etiqueta({ id, children, opcional }: { id: Campo; children: React.ReactNode; opcional?: boolean }) {
  return (
    <label htmlFor={`lp-form-${id}`} className="mb-1.5 block text-sm font-semibold text-[#17130f]">
      {children}
      {opcional && <span className="ml-1 font-normal text-[#8a8478]">(opcional)</span>}
    </label>
  )
}

function Error({ id, mensaje }: { id: Campo; mensaje?: string }) {
  if (!mensaje) return null
  return (
    <p id={`lp-form-${id}-error`} className="mt-1.5 text-xs text-[#c0392b]">
      {mensaje}
    </p>
  )
}

function Texto({ id, etiqueta, placeholder, autoComplete, error, valores, setValores, setTocados }: ComunProps & {
  placeholder: string
  autoComplete: string
}) {
  return (
    <div>
      <Etiqueta id={id}>{etiqueta}</Etiqueta>
      <input
        id={`lp-form-${id}`}
        name={id}
        type="text"
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={valores[id]}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `lp-form-${id}-error` : undefined}
        onChange={(e) => setValores((previos) => ({ ...previos, [id]: e.target.value }))}
        onBlur={() => setTocados((previos) => ({ ...previos, [id]: true }))}
        className={`${CLASE_CAMPO} ${error ? "border-[#c0392b]" : "border-[#e5e0d8]"}`}
      />
      <Error id={id} mensaje={error} />
    </div>
  )
}

function Lista({ id, etiqueta, opciones, vacio = "Selecciona", opcional, error, valores, setValores, setTocados }: ComunProps & {
  opciones: { valor: string; etiqueta: string }[]
  vacio?: string
  opcional?: boolean
}) {
  return (
    <div>
      <Etiqueta id={id} opcional={opcional}>{etiqueta}</Etiqueta>
      <select
        id={`lp-form-${id}`}
        name={id}
        value={valores[id]}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `lp-form-${id}-error` : undefined}
        onChange={(e) => setValores((previos) => ({ ...previos, [id]: e.target.value }))}
        onBlur={() => setTocados((previos) => ({ ...previos, [id]: true }))}
        className={`${CLASE_CAMPO} cursor-pointer ${error ? "border-[#c0392b]" : "border-[#e5e0d8]"}`}
      >
        <option value="">{vacio}</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
        ))}
      </select>
      <Error id={id} mensaje={error} />
    </div>
  )
}
