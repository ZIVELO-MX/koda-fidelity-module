"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Gift, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { TextColorPicker } from "@/components/dashboard/text-color-picker"
import { AvisoDeColorDeTexto } from "@/components/aviso-de-color-de-texto"
import { BarraDePasos } from "@/components/onboarding/barra-de-pasos"
import { PLANES } from "@/lib/planes"
import { mesesGratisExactos } from "@/lib/precios"
import {
  cuerpoDelCorreo, enlaceDeCorreo, NOMBRE_DEL_INTERVALO, NOMBRE_DEL_PLAN, solicitarActivacion,
  solicitudVigente, SOPORTE, type IntervaloSolicitado, type PlanSolicitado, type Solicitud,
} from "@/lib/solicitudes-de-activacion"
import {
  ErrorDelAlta, ORIGENES, SELLOS_POSIBLES, avanzar, guardarBorrador, leerAlta,
  type AccionDelAlta, type AcquisitionSource, type BillingInterval, type EstadoDelAlta,
} from "@/lib/onboarding"
import { conservarContexto } from "@/lib/onboarding"
import { enumerar, hayQueReanudar, loGuardado } from "@/lib/alta-reanudacion"
import { crearColaDeBorrador, fusionarCambios, type ColaDeBorrador } from "@/lib/cola-de-borrador"
import { esAcabadoPro, nombreDeTema } from "@/lib/temas-de-tarjeta"
import { siteConfig } from "@/lib/site-config"
import { type Fallo } from "@/lib/fallos-de-api"
import { cn } from "@/lib/utils"

const SELLOS_POR_DEFECTO = 10
const PESOS = new Intl.NumberFormat("es-MX")

const INTRO = [
  {
    titulo: "Tu tarjeta de sellos, en el teléfono de tu cliente",
    texto: "La misma mecánica de siempre: viene, compra, junta sellos y se lleva su premio. Sin cartón que se pierda.",
  },
  {
    titulo: "Tus clientes no instalan nada",
    texto: "Escanean tu código y su tarjeta se abre en el navegador. Ni aplicación que bajar ni contraseña que recordar.",
  },
  {
    titulo: "¿Sabes quién vuelve?",
    texto: "Cada sello queda registrado, así que ves a cuánta gente estás fidelizando y qué premios se llevan.",
  },
]

type CambiosDelBorrador = Parameters<typeof guardarBorrador>[1]

function conCambios(estado: EstadoDelAlta, cambios: CambiosDelBorrador | null): EstadoDelAlta {
  if (!cambios) return estado
  const { business, card, ...opciones } = cambios
  return { ...estado, ...opciones, negocio: { ...estado.negocio, ...business }, tarjeta: { ...estado.tarjeta, ...card } }
}

type Aviso = { texto: string; reintentable: boolean; requestId?: string } | null

/**
 * El color con el que se pinta la tarjeta cuando el tema efectivo no manda.
 *
 * El servidor devuelve `effectiveThemeId: null` cuando el acabado Pro elegido
 * no tiene plan que lo sostenga, y entonces la tarjeta se pinta con el color
 * que eligió el negocio. Si no eligió ninguno, el naranja de KODA. Nunca queda
 * sin identidad, que es lo que pide el diseño.
 *
 * El naranja sale de `siteConfig` y no de un literal: es el mismo que usan
 * Marca, el asistente de tarjetas y el manifiesto, y tenerlo en dos sitios ya
 * había dejado dos naranjas distintos en la misma pantalla.
 */
function colorDeRespaldo(estado: EstadoDelAlta) {
  return estado.tarjeta.brandColor || siteConfig.defaultBrandColor
}

function enfocarCampo(elemento: HTMLElement | null) {
  if (!elemento) return
  elemento.focus({ preventScroll: true })
  elemento.scrollIntoView?.({
    block: "center",
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  })
}

export function Alta() {
  const router = useRouter()
  const [estado, setEstado] = useState<EstadoDelAlta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [ocupado, setOcupado] = useState(false)
  // Un booleano solo sabía decir "guardando" y callarse. Lo que hacía falta es
  // que confirme: quien escribe necesita ver que quedó, no que algo parpadeó.
  const [guardado, setGuardado] = useState<"inactivo" | "guardando" | "guardado" | "sinGuardar">("inactivo")
  // El aviso de reanudación se calcula con el primer estado del servidor y se
  // congela: si luego se guarda algo más, no vuelve a saltar.
  const [reanudado, setReanudado] = useState<string[] | null>(null)
  const [laminaIntro, setLaminaIntro] = useState(0)
  const [errorNombreNegocio, setErrorNombreNegocio] = useState(false)
  const [errorCategoriaNegocio, setErrorCategoriaNegocio] = useState(false)
  const [errorRecompensa, setErrorRecompensa] = useState(false)
  const nombreNegocioRef = useRef<HTMLInputElement>(null)
  const categoriaNegocioRef = useRef<HTMLButtonElement>(null)
  const categoriaGrupoRef = useRef<HTMLFieldSetElement>(null)
  const recompensaRef = useRef<HTMLInputElement>(null)

  const [conflicto, setConflicto] = useState(false)
  const avisoMostrado = useRef<typeof aviso>(null)
  const confirmado = useRef<EstadoDelAlta | null>(null)
  const cola = useRef<ColaDeBorrador<EstadoDelAlta, CambiosDelBorrador> | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const porEncolar = useRef<CambiosDelBorrador | null>(null)
  const bloqueo = useRef(false)
  const pausado = useRef(false)
  const montado = useRef(true)

  const cancelarTemporizador = useCallback(() => {
    if (temporizador.current !== null) clearTimeout(temporizador.current)
    temporizador.current = null
  }, [])

  const publicar = useCallback((actual: EstadoDelAlta, pendientes: CambiosDelBorrador | null = null) => {
    const completo = conservarContexto(confirmado.current, actual)
    confirmado.current = completo
    if (montado.current) setEstado(conCambios(completo, fusionarCambios(pendientes, porEncolar.current ?? {})))
  }, [])

  const manejarFallo = useCallback((error: unknown) => {
    if (!montado.current) return
    if (!(error instanceof ErrorDelAlta)) {
      setAviso({ texto: "Ocurrió algo inesperado.", reintentable: true })
      return
    }
    const f = error.fallo
    if (f.tipo !== "conflicto") setConflicto(false)
    if (f.tipo === "validacion") {
      setAviso(null)
      toast.error(f.mensaje)
      const actual = confirmado.current
      if (actual?.step === "BUSINESS") {
        const categoriaInvalida = /categor[ií]a/i.test(f.mensaje)
        const nombreFalta = !actual.negocio.name?.trim()
        const categoriaFalta = categoriaInvalida || !actual.negocio.categoryId
        setErrorNombreNegocio(nombreFalta)
        setErrorCategoriaNegocio(categoriaFalta)
        if (nombreFalta) window.requestAnimationFrame(() => enfocarCampo(nombreNegocioRef.current))
        else if (categoriaFalta) window.requestAnimationFrame(() => enfocarCampo(categoriaNegocioRef.current ?? categoriaGrupoRef.current))
      } else if (actual?.step === "CARD" && /recompensa/i.test(f.mensaje)) {
        setErrorRecompensa(true)
        window.requestAnimationFrame(() => enfocarCampo(recompensaRef.current))
      }
      return
    }
    if (f.tipo === "sesion") {
      router.replace("/login")
      return
    }
    if (f.tipo === "conflicto") {
      pausado.current = true
      cancelarTemporizador()
      setConflicto(true)
      setGuardado("sinGuardar")
      setAviso({ texto: "El borrador cambió en otro sitio. Tus cambios siguen aquí, pero no están guardados.", reintentable: false })
      return
    }
    if (f.tipo === "red") {
      setAviso({ texto: "No hay conexión con el servidor.", reintentable: true })
      return
    }
    setAviso({ texto: f.mensaje, reintentable: true, requestId: f.requestId })
  }, [router, cancelarTemporizador])

  const iniciarCola = useCallback((version: number) => {
    cola.current = crearColaDeBorrador<EstadoDelAlta, CambiosDelBorrador>({
      versionInicial: version,
      guardar: guardarBorrador,
      versionDe: (e) => e.draftVersion,
      alGuardar: (e, pendientes) => {
        publicar(e, pendientes)
        if (montado.current) setAviso(null)
      },
      alVaciar: () => {
        if (montado.current && !porEncolar.current && !pausado.current) setGuardado("guardado")
      },
      alFallar: (error) => {
        pausado.current = true
        cancelarTemporizador()
        if (montado.current) setGuardado("sinGuardar")
        manejarFallo(error)
      },
    })
  }, [publicar, cancelarTemporizador, manejarFallo])

  const vaciarCola = useCallback(async () => {
    const c = cola.current
    if (!c || pausado.current || !montado.current) return false
    const cambios = porEncolar.current
    porEncolar.current = null
    if (cambios) await c.encolar(cambios)
    await c.vaciar()
    return !pausado.current && montado.current
  }, [])

  const guardarPronto = useCallback((cambios: CambiosDelBorrador) => {
    if (bloqueo.current) return
    porEncolar.current = fusionarCambios(porEncolar.current, cambios)
    setEstado((actual) => actual ? conCambios(actual, cambios) : actual)
    cancelarTemporizador()
    if (pausado.current) {
      setGuardado("sinGuardar")
      return
    }
    setGuardado("guardando")
    temporizador.current = setTimeout(() => {
      temporizador.current = null
      void vaciarCola().catch(() => { /* La cola conserva el lote y muestra el fallo. */ })
    }, 700)
  }, [cancelarTemporizador, vaciarCola])

  const recargar = useCallback(async () => {
    if (bloqueo.current) return
    bloqueo.current = true
    setOcupado(true)
    cancelarTemporizador()
    try {
      const actual = await leerAlta()
      if (!montado.current) return
      const pendientes = cola.current?.pendientes() ?? null
      if ((pendientes || porEncolar.current) && actual.status !== "IN_PROGRESS") {
        manejarFallo(new ErrorDelAlta({ tipo: "conflicto", mensaje: "El alta ya cambió de estado." }))
        setAviso({ texto: "El alta cambió de estado en otro sitio. Tus cambios siguen aquí; puedes usar la versión del servidor.", reintentable: false })
        return
      }
      publicar(actual, pendientes)
      if (!cola.current) iniciarCola(actual.draftVersion)
      cola.current?.sembrar(actual.draftVersion)
      cola.current?.reanudar()
      pausado.current = false
      setConflicto(false)
      setAviso(null)
      if (pendientes || porEncolar.current) {
        setGuardado("guardando")
        await vaciarCola()
      } else setGuardado("inactivo")
    } catch (error) {
      pausado.current = true
      manejarFallo(error)
    } finally {
      bloqueo.current = false
      if (montado.current) setOcupado(false)
    }
  }, [cancelarTemporizador, publicar, vaciarCola, manejarFallo, iniciarCola])

  const usarServidor = useCallback(async () => {
    if (bloqueo.current || !window.confirm("¿Descartar tus cambios sin guardar y usar la versión del servidor?")) return
    bloqueo.current = true
    setOcupado(true)
    try {
      const actual = await leerAlta()
      if (!montado.current) return
      porEncolar.current = null
      cola.current?.descartar()
      cola.current?.sembrar(actual.draftVersion)
      publicar(actual)
      pausado.current = false
      setConflicto(false)
      setAviso(null)
      setGuardado("inactivo")
    } catch (error) { manejarFallo(error) }
    finally {
      bloqueo.current = false
      if (montado.current) setOcupado(false)
    }
  }, [publicar, manejarFallo])

  useEffect(() => {
    let activo = true
    montado.current = true
    leerAlta().then((inicial) => {
      if (!activo) return
      publicar(inicial)
      if (hayQueReanudar(inicial)) setReanudado(loGuardado(inicial))
      iniciarCola(inicial.draftVersion)
    }).catch((error: unknown) => { if (activo) manejarFallo(error) })
      .finally(() => { if (activo) setCargando(false) })
    return () => {
      activo = false
      montado.current = false
      cancelarTemporizador()
      cola.current?.detener()
    }
  }, [publicar, manejarFallo, cancelarTemporizador, iniciarCola])

  const pedirAvance = useCallback(async (accion: AccionDelAlta, intervalo?: BillingInterval) => {
    if (!confirmado.current || bloqueo.current || pausado.current) return
    if (accion === "complete_business" && estado) {
      const faltaNombre = !estado.negocio.name?.trim()
      const faltaCategoria = !estado.negocio.categoryId
      setErrorNombreNegocio(faltaNombre)
      setErrorCategoriaNegocio(faltaCategoria)
      if (faltaNombre || faltaCategoria) {
        setAviso(null)
        toast.error(
          faltaNombre && faltaCategoria
            ? "Completa nombre y categoría del negocio."
            : faltaNombre
              ? "Completa el nombre del negocio."
              : "Selecciona la categoría del negocio.",
        )
        enfocarCampo(faltaNombre ? nombreNegocioRef.current : categoriaNegocioRef.current ?? categoriaGrupoRef.current)
        return
      }
    }
    if (accion === "complete_card" && !recompensaRef.current?.value.trim()) {
      setErrorRecompensa(true)
      setAviso(null)
      toast.error("Escribe la recompensa para continuar.")
      enfocarCampo(recompensaRef.current)
      return
    }
    if (accion === "complete_card") setErrorRecompensa(false)
    bloqueo.current = true
    setOcupado(true)
    setAviso(null)
    cancelarTemporizador()
    try {
      if (!await vaciarCola()) return
      // Continuar confirma también el valor inicial que el selector ya muestra.
      // Se comprueba después de vaciar para respetar una selección en vuelo.
      if (accion === "complete_card" && confirmado.current.tarjeta.stampsRequired === undefined) {
        await cola.current?.encolar({ card: { stampsRequired: SELLOS_POR_DEFECTO } })
        if (!montado.current) return
      }
      const siguiente = await avanzar(accion, cola.current?.version() ?? confirmado.current.draftVersion, intervalo)
      publicar(siguiente)
      cola.current?.sembrar(siguiente.draftVersion)
    } catch (error) { manejarFallo(error) }
    finally {
      bloqueo.current = false
      if (montado.current) setOcupado(false)
    }
  }, [estado, cancelarTemporizador, vaciarCola, publicar, manejarFallo])

  useEffect(() => {
    if (!aviso) return
    if (avisoMostrado.current === aviso) return
    avisoMostrado.current = aviso
    toast.error(aviso.texto, {
      id: "onboarding-aviso",
      description: aviso.requestId ? `Referencia para soporte: ${aviso.requestId}` : undefined,
      duration: aviso.reintentable || conflicto ? Infinity : 8000,
      action: conflicto
        ? { label: "Reaplicar mis cambios", onClick: () => void recargar() }
        : aviso.reintentable
          ? { label: "Reintentar", onClick: () => void recargar() }
          : undefined,
      cancel: conflicto
        ? { label: "Usar versión del servidor", onClick: () => void usarServidor() }
        : undefined,
    })
  }, [aviso, conflicto, recargar, usarServidor])

  useEffect(() => {
    if (!reanudado?.length) return
    toast.info("Retomamos donde lo dejaste.", {
      id: "onboarding-reanudado",
      description: `Ya tenías guardado ${enumerar(reanudado)}.`,
      duration: 10000,
      action: {
        label: "Entendido",
        onClick: () => {
          setReanudado(null)
          toast.dismiss("onboarding-reanudado")
        },
      },
    })
  }, [reanudado])

  if (cargando) {
    return (
      <div className="landing flex min-h-screen items-center justify-center bg-background forced-light">
        <p className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Recuperando tu alta…
        </p>
      </div>
    )
  }

  if (!estado) {
    return (
      <div className="landing flex min-h-screen items-center justify-center bg-background p-6 forced-light">
        <div className="max-w-sm space-y-4 text-center">
          <p role="alert" className="text-foreground">
            No pudimos recuperar tu alta. Revisa el aviso para ver el detalle.
          </p>
          <Button className="min-h-11" onClick={() => void recargar()}>
            Volver a intentar
          </Button>
        </div>
      </div>
    )
  }

  // Una cuenta ya activa no vuelve al alta por accidente.
  if (estado.status === "ACTIVE") {
    return (
      <div className="landing flex min-h-screen items-center justify-center bg-background p-6 forced-light">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">Tu alta ya está terminada</h1>
          <p className="text-muted-foreground">
            {estado.nombreDeLaCuenta ? `${estado.nombreDeLaCuenta} ya` : "Tu negocio ya"} tiene su programa
            configurado.
          </p>
          <Button asChild className="min-h-11">
            <Link href="/dashboard">Ir a tu panel</Link>
          </Button>
        </div>
      </div>
    )
  }

  const paso = estado.step
  const enPaywall = paso === "PAYWALL" || estado.status === "AWAITING_PAYMENT"

  return (
    <div className="landing min-h-screen bg-background forced-light">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-5">
          {estado.modo === "mock" && (
            <p
              role="status"
              className="mx-auto max-w-xl rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-sm text-foreground"
            >
              <strong className="font-semibold">Onboarding de prueba.</strong> Nada de lo que hagas
              aquí se guarda: el estado vive mientras el proceso esté encendido y se pierde al
              apagarlo.
            </p>
          )}
          <BarraDePasos actual={paso} />
        </header>

        <main id="contenido" className="flex flex-1 flex-col justify-center py-10">
          {paso === "INTRO" && (
            <Intro
              lamina={INTRO[laminaIntro]}
              indice={laminaIntro}
              total={INTRO.length}
              ocupado={ocupado}
              onSiguiente={() =>
                laminaIntro < INTRO.length - 1
                  ? setLaminaIntro(laminaIntro + 1)
                  : void pedirAvance("complete_intro")
              }
              onSaltar={() => void pedirAvance("skip_intro")}
            />
          )}

          {paso === "BUSINESS" && (
            <fieldset disabled={ocupado}>
              <Datos
                estado={estado}
                onCambio={guardarPronto}
                onCambioLocal={setEstado}
                errorNombre={errorNombreNegocio}
                errorCategoria={errorCategoriaNegocio}
                nombreRef={nombreNegocioRef}
                categoriaRef={categoriaNegocioRef}
                categoriaGrupoRef={categoriaGrupoRef}
                onNombreCorregido={() => setErrorNombreNegocio(false)}
                onCategoriaCorregida={() => setErrorCategoriaNegocio(false)}
              />
            </fieldset>
          )}

          {paso === "CARD" && (
            <fieldset disabled={ocupado}>
              <Tarjeta
                estado={estado}
                onCambio={guardarPronto}
                onCambioLocal={setEstado}
                errorRecompensa={errorRecompensa}
                recompensaRef={recompensaRef}
                onRecompensaCorregida={() => setErrorRecompensa(false)}
              />
            </fieldset>
          )}

          {paso === "CARD_READY" && <TarjetaLista estado={estado} />}

          {paso === "ACQUISITION" && (
            <fieldset disabled={ocupado}>
            <Origen
              elegido={estado.acquisitionSource}
              onElegir={(origen) => {
                guardarPronto({ acquisitionSource: origen })
              }}
            />
            </fieldset>
          )}

          {enPaywall && (
            <Paywall
              estado={estado}
              ocupado={ocupado}
              onIntervalo={(intervalo) => void pedirAvance("select_billing_interval", intervalo)}
              onSaltar={() => void pedirAvance("open_paywall")}
            />
          )}
        </main>

        {paso !== "INTRO" && !enPaywall && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
              {guardado === "sinGuardar" ? "Tus cambios siguen aquí. Reintenta antes de cerrar."
                : guardado === "guardando" ? "Guardando…"
                  : guardado === "guardado" ? "Guardado"
                    : "Lo que escribes se guarda solo."}
            </span>
            <div className="flex items-center gap-3">
              {paso === "ACQUISITION" && (
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={ocupado}
                  onClick={() => void pedirAvance("skip_acquisition")}
                >
                  Saltar
                </Button>
              )}
              <Button
                className="min-h-11 px-8"
                disabled={ocupado || guardado === "sinGuardar"}
                onClick={() => {
                  if (paso === "BUSINESS") return void pedirAvance("complete_business")
                  if (paso === "CARD") return void pedirAvance("complete_card")
                  if (paso === "CARD_READY") return void pedirAvance("complete_card_ready")
                  return void pedirAvance("complete_acquisition")
                }}
              >
                {ocupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Continuar"}
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

function Intro({
  lamina, indice, total, ocupado, onSiguiente, onSaltar,
}: {
  lamina: (typeof INTRO)[number]
  indice: number
  total: number
  ocupado: boolean
  onSiguiente: () => void
  onSaltar: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex items-start gap-3 sm:gap-5">
        <Image
          src="/short-logo.svg"
          alt="Logo de Koda Fidelity"
          width={56}
          height={56}
          className="onboarding-mascota mt-2 size-11 shrink-0 object-contain sm:size-14"
          priority
        />
        <div key={indice} className="onboarding-intro-slide relative min-w-0 flex-1 rounded-2xl border border-border bg-card p-5 text-left shadow-sm sm:p-7" aria-live="polite" aria-atomic="true">
          <span aria-hidden="true" className="absolute -left-1.5 top-6 size-3 rotate-45 border-b border-l border-border bg-card" />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Fidelity te cuenta</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{lamina.titulo}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{lamina.texto}</p>
        </div>
      </div>

      {indice === 2 && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            Así se verá la tarjeta de tu cliente
          </p>
          <div className="onboarding-card-float mx-auto w-full max-w-[280px]">
            <LoyaltyCardPreview
              businessName={siteConfig.hero.demoCard.businessName}
              currentStamps={siteConfig.hero.demoCard.currentStamps}
              maxStamps={siteConfig.hero.demoCard.maxStamps}
              reward={siteConfig.hero.demoCard.reward}
              brandColor={siteConfig.hero.demoCard.brandColor}
              showQR={false}
              className="max-w-[280px]"
            />
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="flex justify-center gap-1.5" role="group" aria-label={`Lámina ${indice + 1} de ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn("h-1.5 rounded-full transition-all", i === indice ? "w-6 bg-primary" : "w-1.5 bg-border")}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button variant="ghost" className="min-h-11 w-full sm:w-auto" disabled={ocupado} onClick={onSaltar}>
            Saltar introducción
          </Button>
          <Button className="min-h-11 w-full px-8 sm:w-auto" disabled={ocupado} onClick={onSiguiente}>
            Siguiente &gt;
          </Button>
        </div>
      </div>
    </div>
  )
}

function Datos({
  estado, onCambio, onCambioLocal, errorNombre, errorCategoria, nombreRef, categoriaRef,
  categoriaGrupoRef, onNombreCorregido, onCategoriaCorregida,
}: {
  estado: EstadoDelAlta
  onCambio: (c: { business?: { ownerName?: string; name?: string; categoryId?: string } }) => void
  onCambioLocal: (e: EstadoDelAlta) => void
  errorNombre: boolean
  errorCategoria: boolean
  nombreRef: RefObject<HTMLInputElement | null>
  categoriaRef: RefObject<HTMLButtonElement | null>
  categoriaGrupoRef: RefObject<HTMLFieldSetElement | null>
  onNombreCorregido: () => void
  onCategoriaCorregida: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tu negocio</h1>
        <p className="text-muted-foreground">Dos datos y seguimos. Lo demás se configura después.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre-responsable">Tu nombre</Label>
        <Input id="nombre-responsable" value={estado.negocio.ownerName ?? ""} onChange={(e) => {
          onCambioLocal({ ...estado, negocio: { ...estado.negocio, ownerName: e.target.value } })
          onCambio({ business: { ownerName: e.target.value } })
        }} placeholder="Alex García" autoComplete="name" maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="negocio">Nombre del negocio</Label>
        <Input
          id="negocio"
          ref={nombreRef}
          value={estado.negocio.name ?? ""}
          onChange={(e) => {
            if (e.target.value.trim()) onNombreCorregido()
            onCambioLocal({ ...estado, negocio: { ...estado.negocio, name: e.target.value } })
            onCambio({ business: { name: e.target.value } })
          }}
          placeholder="Café Aurora"
          maxLength={120}
          required
          aria-invalid={errorNombre || undefined}
          aria-describedby={errorNombre ? "error-negocio-nombre" : undefined}
          aria-errormessage={errorNombre ? "error-negocio-nombre" : undefined}
          autoFocus
        />
        {errorNombre && <span id="error-negocio-nombre" className="sr-only">Completa el nombre del negocio.</span>}
      </div>

      {/* Las categorías vienen del backend con su identificador: la interfaz no
          inventa una lista propia que el servidor luego no reconoce. */}
      <fieldset
        ref={categoriaGrupoRef}
        tabIndex={-1}
        aria-describedby={errorCategoria ? "error-negocio-categoria" : undefined}
        className={cn(
          "space-y-2 rounded-xl p-2 transition-colors",
          errorCategoria && "bg-destructive/5 ring-2 ring-destructive ring-offset-2 ring-offset-background",
        )}
      >
        <legend className="text-sm font-medium text-foreground">Categoría</legend>
        {errorCategoria && <span id="error-negocio-categoria" className="sr-only">Selecciona la categoría del negocio.</span>}
        <div className="flex flex-wrap gap-2">
          {estado.categorias.map((categoria, index) => {
            const elegida = estado.negocio.categoryId === categoria.id
            return (
              <button
                key={categoria.id}
                ref={index === 0 ? categoriaRef : undefined}
                type="button"
                aria-pressed={elegida}
                onClick={() => {
                  onCategoriaCorregida()
                  onCambioLocal({ ...estado, negocio: { ...estado.negocio, categoryId: categoria.id } })
                  onCambio({ business: { categoryId: categoria.id } })
                }}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm transition-colors",
                  elegida
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {categoria.name}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

export function Tarjeta({
  estado, onCambio, onCambioLocal, errorRecompensa, recompensaRef, onRecompensaCorregida,
}: {
  estado: EstadoDelAlta
  onCambio: (c: { card?: { reward?: string; stampsRequired?: number; brandColor?: string; themeId?: string; textColor?: "AUTO" | "DARK" | "LIGHT"; iconName?: string | null; stampIconName?: string | null } }) => void
  onCambioLocal: (e: EstadoDelAlta) => void
  errorRecompensa: boolean
  recompensaRef: RefObject<HTMLInputElement | null>
  onRecompensaCorregida: () => void
}) {
  const sellos = estado.tarjeta.stampsRequired ?? SELLOS_POR_DEFECTO
  const color = colorDeRespaldo(estado)

  const elegido = estado.temas.find((t) => t.id === estado.tarjeta.themeId)
  const proSinPlan = Boolean(elegido && elegido.plan === "PRO" && estado.plan !== "PRO")

  const elegirTema = (idDelTema: string) => {
    onCambioLocal({ ...estado, tarjeta: { ...estado.tarjeta, themeId: idDelTema } })
    onCambio({ card: { themeId: idDelTema } })
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tu primera tarjeta</h1>
          <p className="text-muted-foreground">
            Cuántos sellos y qué se lleva. El resto se ajusta cuando quieras.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Sellos para la recompensa</legend>
          <div className="flex flex-wrap gap-2">
            {SELLOS_POSIBLES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={sellos === n}
                onClick={() => {
                  onCambioLocal({ ...estado, tarjeta: { ...estado.tarjeta, stampsRequired: n } })
                  onCambio({ card: { stampsRequired: n } })
                }}
                className={cn(
                  "min-h-10 min-w-12 rounded-xl border px-4 text-sm font-semibold transition-colors",
                  sellos === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="recompensa">Recompensa</Label>
          <Input
            id="recompensa"
            ref={recompensaRef}
            value={estado.tarjeta.reward ?? ""}
            onChange={(e) => {
              if (e.target.value.trim()) onRecompensaCorregida()
              onCambioLocal({ ...estado, tarjeta: { ...estado.tarjeta, reward: e.target.value } })
              onCambio({ card: { reward: e.target.value } })
            }}
            placeholder="Décimo café gratis"
            maxLength={240}
            required
            aria-invalid={errorRecompensa || undefined}
            aria-describedby={errorRecompensa ? "error-recompensa" : undefined}
            aria-errormessage={errorRecompensa ? "error-recompensa" : undefined}
          />
          {errorRecompensa && <span id="error-recompensa" className="sr-only">Escribe la recompensa para continuar.</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color de tu marca</Label>
          <div className="flex items-center gap-3">
            <input
              id="color"
              type="color"
              value={color}
              onChange={(e) => {
                onCambioLocal({ ...estado, tarjeta: { ...estado.tarjeta, brandColor: e.target.value } })
                onCambio({ card: { brandColor: e.target.value } })
              }}
              className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-card p-1"
            />
            <span className="font-mono text-sm text-muted-foreground">{color}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color del texto</Label>
          <TextColorPicker
            value={estado.tarjeta.textColor ?? "LIGHT"}
            brandColor={color}
            themeCode={elegido?.code ?? null}
            onChange={(textColor) => {
              onCambioLocal({ ...estado, tarjeta: { ...estado.tarjeta, textColor } })
              onCambio({ card: { textColor } })
            }}
          />
          <AvisoDeColorDeTexto brandColor={color} themeCode={elegido?.code ?? null} textColor={estado.tarjeta.textColor ?? "LIGHT"} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Ícono de la tarjeta</Label>
            <IconPicker
              value={estado.tarjeta.iconName ?? null}
              onChange={(iconName) => {
                onCambioLocal({ ...estado, tarjeta: { ...estado.tarjeta, iconName } })
                onCambio({ card: { iconName } })
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Ícono del sello</Label>
            <IconPicker
              value={estado.tarjeta.stampIconName ?? null}
              onChange={(stampIconName) => {
                onCambioLocal({ ...estado, tarjeta: { ...estado.tarjeta, stampIconName } })
                onCambio({ card: { stampIconName } })
              }}
            />
          </div>
        </div>

        {estado.temas.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Tema de la tarjeta</legend>
            <p className="text-xs text-muted-foreground">
              Los acabados Pro se pueden elegir desde ahora. Se marcan, pero no se bloquean.
            </p>
            <div className="flex flex-wrap gap-2">
              {estado.temas.map((tema) => {
                const activo = estado.tarjeta.themeId === tema.id
                return (
                  <button
                    key={tema.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => elegirTema(tema.id)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                      activo
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    {nombreDeTema(tema.code)}
                    {esAcabadoPro(tema.code) && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                          activo ? "bg-white/20" : "bg-primary/15 text-primary",
                        )}
                      >
                        Pro
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {proSinPlan && (
              <p className="text-xs text-muted-foreground">
                Tu plan es Lite, así que la tarjeta se publica con tu color. El acabado queda
                guardado y se aplica en cuanto pases a Pro.
              </p>
            )}
          </fieldset>
        )}
      </div>

      <div className="lg:sticky lg:top-8">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Vista previa en vivo
        </p>
        <LoyaltyCardPreview
          businessName={estado.negocio.name || "Tu negocio"}
          currentStamps={Math.min(3, sellos)}
          maxStamps={sellos}
          reward={estado.tarjeta.reward || "Tu recompensa"}
          brandColor={color}
          // Aquí se enseña lo elegido, Pro incluido, aunque el plan sea Lite: probar
          // el acabado es lo que empuja a contratar, y el aviso del selector dice que
          // se publica con el color del negocio. Cómo queda publicada lo enseña
          // «Tarjeta lista», con el tema efectivo.
          themeCode={elegido?.code ?? null}
          textColor={estado.tarjeta.textColor ?? "LIGHT"}
          iconName={estado.tarjeta.iconName}
          stampIconName={estado.tarjeta.stampIconName}
          showQR={false}
          className="mx-auto max-w-[300px]"
        />
      </div>
    </div>
  )
}

export function TarjetaLista({ estado, soloTarjeta = false }: { estado: EstadoDelAlta; soloTarjeta?: boolean }) {
  const nombre = estado.negocio.name || estado.nombreDeLaCuenta || "Tu negocio"
  const temaElegido = estado.temas.find((t) => t.id === estado.tarjeta.themeId)
  const temaProSinPlan = temaElegido?.plan === "PRO" && estado.plan !== "PRO"

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      {!soloTarjeta && (
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tu tarjeta está lista, pero todavía no publicada.
          </h1>
          <p className="text-muted-foreground">Así se verá con los datos que agregaste. Elige un plan para publicarla.</p>
        </div>
      )}

      {soloTarjeta && (
        <h1 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Tu tarjeta está lista, pero todavía no publicada.
        </h1>
      )}

      <div className="rounded-2xl border border-border bg-muted/30 p-3 sm:p-6">
        <LoyaltyCardPreview
          businessName={nombre}
          currentStamps={0}
          maxStamps={estado.tarjeta.stampsRequired ?? SELLOS_POR_DEFECTO}
          reward={estado.tarjeta.reward || "Tu recompensa"}
          brandColor={colorDeRespaldo(estado)}
          themeCode={temaElegido?.code ?? null}
          textColor={estado.tarjeta.textColor ?? "LIGHT"}
          iconName={estado.tarjeta.iconName}
          stampIconName={estado.tarjeta.stampIconName}
          showQR
          qrValue={`KODA-PREVIEW:${estado.primeraTarjetaId ?? nombre}`}
          className="mx-auto w-full max-w-sm"
        />
      </div>

      {temaProSinPlan && (
        <p className="text-center text-sm text-muted-foreground">
          Estás viendo el acabado Pro que elegiste. Se aplicará al contratar Pro; con Lite, la tarjeta se publica con el color de tu negocio.
        </p>
      )}

      {!soloTarjeta && (
        <p className="text-center text-sm text-muted-foreground">
          La tarjeta queda guardada como borrador. El QR es solo ilustrativo; el código público y el enlace se activan al publicar.
        </p>
      )}
    </section>
  )
}

export function Club({ estado }: { estado: EstadoDelAlta }) {
  const nombre = estado.negocio.name || estado.nombreDeLaCuenta || "de tu negocio"
  return (
    <div className="mx-auto max-w-md space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Club {nombre}</h1>
        <p className="text-muted-foreground">Así lo verán tus clientes.</p>
      </div>

      {/* Vacía, con sus sellos por llenar: es la promesa, no una simulación de
          un progreso que nadie ha ganado todavía.

          El QR va aquí y solo aquí dentro del alta. Es la única pantalla que el
          prototipo aprobado muestra con código, porque es el momento de llegada:
          la tarjeta se ve entera, como la verá el cliente. En el paso de la
          tarjeta y en el muro sigue apagado, que es lo que manda el wireframe:
          «sin publicar no hay QR».

          Por eso no lleva enlace. La tarjeta todavía no se publica, así que un
          código que apuntara a su dirección daría en nada; lleva texto inerte y
          quien lo escanee lee el nombre del club, no un error. */}
      <LoyaltyCardPreview
        businessName={estado.negocio.name || "Tu negocio"}
        currentStamps={0}
        maxStamps={estado.tarjeta.stampsRequired ?? 10}
        reward={estado.tarjeta.reward || "Tu recompensa"}
        brandColor={colorDeRespaldo(estado)}
        showQR
        qrValue={`Club ${nombre}`}
        textColor={estado.tarjeta.textColor ?? "LIGHT"}
        iconName={estado.tarjeta.iconName}
        stampIconName={estado.tarjeta.stampIconName}
        className="mx-auto max-w-[300px]"
      />
    </div>
  )
}

function Origen({
  elegido, onElegir,
}: {
  elegido: AcquisitionSource | null
  onElegir: (origen: AcquisitionSource) => void
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          ¿Cómo llegaste a Koda Fidelity?
        </h1>
        <p className="text-muted-foreground">
          Nos sirve para saber dónde encontrarnos con más negocios como el tuyo. Puedes saltarla.
        </p>
      </div>

      <div className="space-y-2">
        {ORIGENES.map((origen) => (
          <button
            key={origen.valor}
            type="button"
            aria-pressed={elegido === origen.valor}
            onClick={() => onElegir(origen.valor)}
            className={cn(
              "flex min-h-11 w-full items-center justify-between rounded-xl border px-4 text-left text-sm transition-colors",
              elegido === origen.valor
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {origen.etiqueta}
            {elegido === origen.valor && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * La tarjeta guardada, detrás del muro. No es decoración: es lo que la persona
 * ya hizo, y verlo es la diferencia entre "me piden dinero" y "me falta un paso
 * para publicar esto". Va atenuada porque todavía no está publicada, y las tres
 * acciones que dependen del QR aparecen con su razón en vez de desaparecer: una
 * tarjeta que nunca se activó no genera código, así que no hay nada que
 * compartir, descargar ni imprimir.
 *
 * `aria-disabled` en vez de `disabled`: el botón sigue recibiendo foco, que es
 * la única forma de que quien navega con teclado o lector llegue a la razón.
 */
/**
 * El folio, y el correo que la persona tiene que mandar.
 *
 * Lo que más importa de esta pantalla es lo que dice que **no** pasó: crear la
 * solicitud no manda el correo, no cobra, no activa el plan y no publica la
 * tarjeta. Un folio a secas se lee como "ya está", y no está.
 *
 * El botón de copiar existe porque `mailto:` no abre nada en un buen número de
 * navegadores y equipos. Si no se puede escribir en el portapapeles, el texto
 * queda a la vista para copiarlo a mano.
 */
export function SolicitudCreada({
  solicitud, negocio, correo, copiado, onCopiar,
}: {
  solicitud: Solicitud
  negocio: string | null
  correo: string | null
  copiado: boolean
  onCopiar: (valor: boolean) => void
}) {
  // Lo que manda es lo del servidor: es lo que soporte va a cotejar contra el
  // folio. El alta solo rellena si el servidor no lo trajo.
  const datos = {
    folio: solicitud.folio,
    negocio: solicitud.negocio ?? negocio,
    correo: solicitud.correo ?? correo,
    plan: solicitud.plan,
    intervalo: solicitud.intervalo,
  }
  const cuerpo = cuerpoDelCorreo(datos)
  const atendida = solicitud.estado === "COMPLETED"

  return (
    <section aria-labelledby="folio-titulo" className="space-y-4 rounded-2xl border-2 border-primary bg-card p-6">
      <div className="space-y-1">
        <h2 id="folio-titulo" className="text-lg font-semibold text-foreground">
          {atendida ? "Tu solicitud fue atendida" : "Tu solicitud quedó registrada"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Plan {NOMBRE_DEL_PLAN[solicitud.plan]}, {NOMBRE_DEL_INTERVALO[solicitud.intervalo]}.
        </p>
      </div>

      <p className="rounded-xl bg-muted/50 px-4 py-3 text-center">
        <span className="block text-xs text-muted-foreground">Folio</span>
        <span className="font-mono text-xl font-bold tracking-wider text-foreground">{solicitud.folio}</span>
      </p>

      {/* Lo que no pasó, antes que lo que sigue. Salvo que ya la hayan
          atendido, en cuyo caso pedir el correo otra vez sería un estorbo. */}
      {atendida ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-foreground">Soporte ya atendió tu solicitud.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Si tu plan todavía no aparece activo, escribe a {SOPORTE} con este folio.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-foreground">Falta que tú mandes el correo.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrar la solicitud no envía nada, no cobra, no activa tu plan y no publica tu tarjeta.
            Soporte confirma las condiciones contigo antes de activarla.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="min-h-11 flex-1">
          <a href={enlaceDeCorreo(datos)}>Escribir a {SOPORTE}</a>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1"
          onClick={() => {
            void navigator.clipboard?.writeText(cuerpo).then(
              () => onCopiar(true),
              () => onCopiar(false),
            )
          }}
        >
          {copiado ? "Texto copiado" : "Copiar el texto"}
        </Button>
      </div>

      <details className="rounded-xl border border-border p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-foreground">
          Ver el texto del correo
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{cuerpo}</pre>
      </details>
    </section>
  )
}

export function TarjetaGuardada({ estado }: { estado: EstadoDelAlta }) {
  const razon = "razon-sin-publicar"
  const nombre = estado.negocio.name || estado.nombreDeLaCuenta || "Tu negocio"
  const temaElegido = estado.temas.find((t) => t.id === estado.tarjeta.themeId)
  // El acabado Pro no se aplica sin plan que lo sostenga, igual que en el
  // servidor. La selección no se pierde, solo no se pinta todavía.
  const temaEfectivo =
    temaElegido && (temaElegido.plan === "LITE" || estado.plan === "PRO") ? temaElegido.code : null

  return (
    <section className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="opacity-60">
        <LoyaltyCardPreview
          businessName={nombre}
          currentStamps={0}
          maxStamps={estado.tarjeta.stampsRequired ?? 10}
          reward={estado.tarjeta.reward || "Tu recompensa"}
          brandColor={colorDeRespaldo(estado)}
          themeCode={temaEfectivo}
          textColor={estado.tarjeta.textColor ?? "LIGHT"}
          iconName={estado.tarjeta.iconName}
          stampIconName={estado.tarjeta.stampIconName}
          showQR={false}
          className="mx-auto max-w-[280px]"
        />
      </div>

      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-foreground">
        Tu tarjeta está lista, pero todavía no publicada.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {["Compartir", "Descargar", "Imprimir"].map((accion) => (
          <button
            key={accion}
            type="button"
            aria-disabled="true"
            aria-describedby={razon}
            onClick={(evento) => evento.preventDefault()}
            className="inline-flex min-h-11 cursor-not-allowed items-center rounded-xl border border-border px-4 text-sm text-muted-foreground opacity-60"
          >
            {accion}
          </button>
        ))}
      </div>

      <p id={razon} className="text-center text-xs text-muted-foreground">
        Sin publicar no hay código QR, así que todavía no hay nada que compartir. Tu negocio y tu
        tarjeta siguen guardados.
      </p>
    </section>
  )
}

function Paywall({
  estado, ocupado, onIntervalo, onSaltar,
}: {
  estado: EstadoDelAlta
  ocupado: boolean
  onIntervalo: (intervalo: BillingInterval) => void
  onSaltar: () => void
}) {
  const router = useRouter()
  const [slide, setSlide] = useState<"tarjeta" | "planes">("tarjeta")
  // FID-0028: no hay cobro. Se crea una solicitud con folio que soporte usa
  // para localizar la cuenta, y el correo lo manda la persona, no el sistema.
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [enviando, setEnviando] = useState<PlanSolicitado | null>(null)
  const [fallo, setFallo] = useState<Fallo | null>(null)
  const [copiado, setCopiado] = useState(false)

  // Al recargar se recupera la solicitud pendiente, si la hay.
  useEffect(() => {
    let vivo = true
    const turno = window.setTimeout(() => {
      void solicitudVigente().then((r) => {
        if (!vivo) return
        if (r.ok) setSolicitud(r.solicitud)
      })
    }, 0)
    return () => {
      vivo = false
      window.clearTimeout(turno)
    }
  }, [])

  useEffect(() => {
    if (estado.status !== "AWAITING_PAYMENT") return
    let vivo = true
    let timer: ReturnType<typeof setTimeout>
    const comprobarActivacion = async () => {
      try {
        const actual = await leerAlta()
        if (!vivo) return
        if (actual.status === "ACTIVE") {
          router.replace("/dashboard")
          return
        }
      } catch {
        // Si no hay conexión, el muro sigue bloqueado y vuelve a consultar.
      }
      if (vivo) timer = setTimeout(() => void comprobarActivacion(), 5000)
    }
    timer = setTimeout(() => void comprobarActivacion(), 5000)
    return () => {
      vivo = false
      clearTimeout(timer)
    }
  }, [estado.status, router])

  const onSolicitar = async (plan: PlanSolicitado) => {
    setEnviando(plan)
    setFallo(null)
    setCopiado(false)
    const intervalo: IntervaloSolicitado = anual ? "ANNUAL" : "MONTHLY"
    const r = await solicitarActivacion(plan, intervalo)
    if (r.ok) setSolicitud(r.solicitud)
    else setFallo(r.fallo)
    setEnviando(null)
  }

  // El anual llega seleccionado: es el recomendado y el que regala dos meses.
  const anual = (estado.selectedBillingInterval ?? "ANNUAL") === "ANNUAL"
  const lite = PLANES.find((p) => p.id === "lite")!
  const pro = PLANES.find((p) => p.id === "pro")!
  const precio = (plan: typeof lite) => (anual ? plan.anual : plan.mensual)
  const periodo = anual ? "MXN al año" : "MXN al mes"

  if (estado.status === "AWAITING_PAYMENT") {
    return (
      <section className="mx-auto w-full max-w-xl space-y-6 rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8" aria-labelledby="espera-activacion-titulo">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-7 animate-spin" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 id="espera-activacion-titulo" className="text-2xl font-bold tracking-tight text-foreground">Tu plan todavía no está activo</h1>
          <p className="text-muted-foreground">Soporte debe activar tu cuenta antes de que puedas entrar al panel o publicar la tarjeta. La revisaremos automáticamente mientras esperas.</p>
        </div>
        {solicitud ? (
          <SolicitudCreada
            solicitud={solicitud}
            negocio={estado.nombreDeLaCuenta}
            correo={estado.correoDeLaCuenta}
            copiado={copiado}
            onCopiar={setCopiado}
          />
        ) : (
          <a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 font-medium text-primary underline underline-offset-4" href={`mailto:${SOPORTE}`}>
            Escribir a soporte
          </a>
        )}
        <p role="status" className="text-xs text-muted-foreground">Tu negocio y la tarjeta siguen guardados como borrador. No hay un botón para continuar hasta que el plan esté activo.</p>
      </section>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {slide === "tarjeta" ? (
        <div className="space-y-8">
          <TarjetaLista estado={estado} soloTarjeta />
          <div className="flex justify-center">
            <Button className="min-h-11 px-8" disabled={ocupado} onClick={() => setSlide("planes")}>
              Continuar
            </Button>
          </div>
        </div>
      ) : (
        <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Ahora sí, los planes.</h1>
        <p className="text-muted-foreground">Elige el plan que mejor acompaña a tu negocio.</p>
      </div>

      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Cómo quieres pagar"
          className="relative isolate grid w-full max-w-[380px] grid-cols-2 rounded-full border border-border bg-card p-1"
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-1 left-1 z-0 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
              anual ? "translate-x-0" : "translate-x-full",
            )}
          />
          {([["ANNUAL", "Al año"], ["MONTHLY", "Al mes"]] as const).map(([valor, etiqueta]) => {
            const seleccionado = (valor === "ANNUAL") === anual
            return (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={seleccionado}
                disabled={ocupado}
                onClick={() => onIntervalo(valor)}
                className={cn(
                  "relative z-10 inline-flex min-h-10 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none focus-visible:z-20",
                  seleccionado ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {etiqueta}
                {valor === "ANNUAL" && (
                  <span className={cn(
                    "whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors duration-200 motion-reduce:transition-none",
                    seleccionado ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {mesesGratisExactos(lite.mensual, lite.anual)} meses gratis
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Los dos planes se pueden solicitar desde el principio. Pro ya no se
            enseña atenuado "para el mes que viene": soporte confirma las
            condiciones de cualquiera de los dos antes de activar. */}
        {([lite, pro] as const).map((plan) => {
          const destacado = plan.id === "lite"
          const codigo: PlanSolicitado = plan.id === "lite" ? "LITE" : "PRO"
          const beneficios = plan.incluye.filter((incluye) => incluye !== "El primer mes con todo lo de Pro")
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl bg-card p-6",
                destacado ? "border-2 border-primary" : "border border-border",
              )}
            >
              <h2 className="text-xl font-semibold text-foreground">{plan.nombre}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.resumen}</p>
              <p className="mt-5 text-3xl font-bold text-foreground">
                ${PESOS.format(precio(plan))}{" "}
                <span className="text-sm font-normal text-muted-foreground">{periodo}</span>
              </p>
              {destacado && (
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-background">
                  <Gift className="size-5 shrink-0" aria-hidden="true" />
                  <p className="text-sm font-semibold">Incluye un mes con todo lo de Pro</p>
                </div>
              )}
              <ul className="mt-5 flex-1 space-y-3" aria-label={`Incluye ${plan.nombre}`}>
                {beneficios.map((beneficio) => (
                  <li key={beneficio} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{beneficio}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 min-h-11 w-full"
                variant={destacado ? "default" : "outline"}
                disabled={enviando !== null}
                onClick={() => void onSolicitar(codigo)}
              >
                {enviando === codigo && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Solicitar activación de {plan.nombre}
              </Button>
            </div>
          )
        })}
      </div>

      {fallo && (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-foreground">{fallo.titulo}</p>
          <p className="text-sm text-muted-foreground">{fallo.detalle}</p>
          {fallo.accion && <p className="text-sm text-muted-foreground">{fallo.accion}</p>}
          {fallo.requestId && (
            <p className="font-mono text-xs text-muted-foreground">Referencia: {fallo.requestId}</p>
          )}
        </div>
      )}

      {solicitud && (
        <SolicitudCreada
          solicitud={solicitud}
          negocio={estado.negocio.name || estado.nombreDeLaCuenta}
          correo={estado.correoDeLaCuenta}
          copiado={copiado}
          onCopiar={setCopiado}
        />
      )}

      {/* Salir no es un botón escondido. */}
      <div className="text-center">
        <Button variant="ghost" className="min-h-11" disabled={ocupado} onClick={onSaltar}>
          Saltar sin publicar
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Sin publicar, tu tarjeta no genera código QR y tus clientes todavía no pueden unirse.
        </p>
      </div>

      <div className="flex justify-center">
        <Button className="min-h-11 px-8" onClick={() => setSlide("tarjeta")}>
          Volver a tu tarjeta
        </Button>
      </div>
        </>
      )}
    </div>
  )
}
