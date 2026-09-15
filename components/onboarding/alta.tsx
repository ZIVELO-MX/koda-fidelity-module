"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { BarraDePasos } from "@/components/onboarding/barra-de-pasos"
import { PLANES } from "@/lib/planes"
import { cuentaDelAnual } from "@/lib/precios"
import {
  BORRADOR_VACIO, CATEGORIAS, SELLOS_POSIBLES, cargarBorrador, guardarBorrador,
  loQueFalta, pasoAnterior, pasoSiguiente, type Borrador, type PasoId,
} from "@/lib/onboarding"
import { cn } from "@/lib/utils"

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
    titulo: "Sabes quién vuelve",
    texto: "Cada sello queda registrado, así que ves a cuánta gente estás fidelizando y qué premios se llevan.",
  },
]

const ORIGENES = [
  "Un conocido me lo recomendó",
  "Lo vi en redes sociales",
  "Lo busqué en internet",
  "Ya uso Koda POS",
  "Otro",
]

export function Alta({
  nombreInicial,
  categoriaInicial,
  colorInicial,
}: {
  nombreInicial: string
  categoriaInicial: string
  colorInicial: string
}) {
  const [borrador, setBorrador] = useState<Borrador>({
    ...BORRADOR_VACIO,
    negocio: nombreInicial,
    categoria: categoriaInicial,
    color: colorInicial,
  })
  const [cargado, setCargado] = useState(false)
  const [seGuarda, setSeGuarda] = useState(true)
  const [laminaIntro, setLaminaIntro] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [reanudado, setReanudado] = useState(false)

  // Reanudación: si hay algo a medias se recupera tal cual quedó. Lo que no se
  // hace es dar por contestado lo que nadie contestó.
  useEffect(() => {
    const previo = cargarBorrador()
    if (previo) {
      setBorrador((actual) => ({
        ...previo,
        negocio: previo.negocio || actual.negocio,
        categoria: previo.categoria || actual.categoria,
      }))
      if (previo.paso !== "intro") setReanudado(true)
    }
    setCargado(true)
  }, [])

  useEffect(() => {
    if (!cargado) return
    setSeGuarda(guardarBorrador(borrador))
  }, [borrador, cargado])

  const paso = borrador.paso
  const cambiar = (cambios: Partial<Borrador>) => setBorrador((b) => ({ ...b, ...cambios }))

  const avanzar = () => {
    const falta = loQueFalta(paso, borrador)
    if (falta) {
      setAviso(falta)
      return
    }
    setAviso(null)
    const siguiente = pasoSiguiente(paso)
    if (siguiente) cambiar({ paso: siguiente })
  }

  const retroceder = () => {
    setAviso(null)
    const anterior = pasoAnterior(paso)
    if (anterior) cambiar({ paso: anterior })
  }

  const saltarA = (destino: PasoId) => {
    setAviso(null)
    cambiar({ paso: destino })
  }

  if (!cargado) {
    return (
      <div className="landing flex min-h-screen items-center justify-center bg-background forced-light">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="landing min-h-screen bg-background forced-light">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-5">
          <BarraDePasos actual={paso} />
          {!seGuarda && (
            <p role="alert" className="mx-auto max-w-xl text-center text-xs text-muted-foreground">
              Este navegador no deja guardar, así que si sales ahora se pierde lo escrito.
            </p>
          )}
          {reanudado && paso !== "pago" && (
            <p className="mx-auto max-w-xl text-center text-xs text-muted-foreground">
              Seguimos donde lo dejaste.
            </p>
          )}
        </header>

        <main id="contenido" className="flex flex-1 flex-col justify-center py-10">
          {paso === "intro" && (
            <Intro
              lamina={INTRO[laminaIntro]}
              indice={laminaIntro}
              total={INTRO.length}
              onSiguiente={() =>
                laminaIntro < INTRO.length - 1 ? setLaminaIntro(laminaIntro + 1) : avanzar()
              }
              onSaltar={() => saltarA("datos")}
            />
          )}

          {paso === "datos" && (
            <Datos borrador={borrador} cambiar={cambiar} aviso={aviso} />
          )}

          {paso === "tarjeta" && (
            <Tarjeta borrador={borrador} cambiar={cambiar} aviso={aviso} />
          )}

          {paso === "club" && <Club borrador={borrador} />}

          {paso === "origen" && (
            <Origen
              elegido={borrador.origen}
              onElegir={(origen) => cambiar({ origen, origenSaltado: false })}
            />
          )}

          {paso === "pago" && <Paywall borrador={borrador} />}
        </main>

        {paso !== "intro" && paso !== "pago" && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <Button variant="ghost" className="min-h-11" onClick={retroceder}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Atrás
            </Button>
            <div className="flex items-center gap-3">
              {paso === "origen" && (
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    cambiar({ origenSaltado: true, origen: null })
                    saltarA("pago")
                  }}
                >
                  Saltar
                </Button>
              )}
              <Button className="min-h-11 px-8" onClick={avanzar}>
                Continuar
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

function Intro({
  lamina, indice, total, onSiguiente, onSaltar,
}: {
  lamina: (typeof INTRO)[number]
  indice: number
  total: number
  onSiguiente: () => void
  onSaltar: () => void
}) {
  return (
    <div className="mx-auto max-w-xl space-y-8 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {lamina.titulo}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{lamina.texto}</p>
      </div>

      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 rounded-full transition-all", i === indice ? "w-6 bg-primary" : "w-1.5 bg-border")}
          />
        ))}
      </div>

      {/* Saltar está a la vista desde la primera lámina, no escondido al final. */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button className="min-h-11 w-full px-8 sm:w-auto" onClick={onSiguiente}>
          {indice < total - 1 ? "Siguiente" : "Empezar"}
        </Button>
        <Button variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onSaltar}>
          Saltar la introducción
        </Button>
      </div>
    </div>
  )
}

function Aviso({ texto }: { texto: string | null }) {
  if (!texto) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {texto}
    </p>
  )
}

function Datos({
  borrador, cambiar, aviso,
}: {
  borrador: Borrador
  cambiar: (c: Partial<Borrador>) => void
  aviso: string | null
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tu negocio</h1>
        <p className="text-muted-foreground">Dos datos y seguimos. Lo demás se configura después.</p>
      </div>

      <Aviso texto={aviso} />

      <div className="space-y-2">
        <Label htmlFor="negocio">Nombre del negocio</Label>
        <Input
          id="negocio"
          value={borrador.negocio}
          onChange={(e) => cambiar({ negocio: e.target.value })}
          placeholder="Café Aurora"
          maxLength={60}
          autoFocus
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((categoria) => {
            const elegida = borrador.categoria === categoria
            return (
              <button
                key={categoria}
                type="button"
                aria-pressed={elegida}
                onClick={() => cambiar({ categoria })}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm transition-colors",
                  elegida
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {categoria}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

function Tarjeta({
  borrador, cambiar, aviso,
}: {
  borrador: Borrador
  cambiar: (c: Partial<Borrador>) => void
  aviso: string | null
}) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tu primera tarjeta</h1>
          <p className="text-muted-foreground">
            Cuántos sellos y qué se lleva. El resto se ajusta cuando quieras.
          </p>
        </div>

        <Aviso texto={aviso} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Sellos para la recompensa</legend>
          <div className="flex flex-wrap gap-2">
            {SELLOS_POSIBLES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={borrador.sellos === n}
                onClick={() => cambiar({ sellos: n })}
                className={cn(
                  "min-h-10 min-w-12 rounded-xl border px-4 text-sm font-semibold transition-colors",
                  borrador.sellos === n
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
            value={borrador.recompensa}
            onChange={(e) => cambiar({ recompensa: e.target.value })}
            placeholder="Décimo café gratis"
            maxLength={60}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color de tu marca</Label>
          <div className="flex items-center gap-3">
            <input
              id="color"
              type="color"
              value={borrador.color}
              onChange={(e) => cambiar({ color: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-card p-1"
            />
            <span className="font-mono text-sm text-muted-foreground">{borrador.color}</span>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-8">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Vista previa en vivo
        </p>
        <LoyaltyCardPreview
          businessName={borrador.negocio || "Tu negocio"}
          currentStamps={0}
          maxStamps={borrador.sellos}
          reward={borrador.recompensa || "Tu recompensa"}
          brandColor={borrador.color}
          showQR={false}
          className="mx-auto max-w-[300px]"
        />
      </div>
    </div>
  )
}

function Club({ borrador }: { borrador: Borrador }) {
  return (
    <div className="mx-auto max-w-md space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Club {borrador.negocio || "de tu negocio"}
        </h1>
        <p className="text-muted-foreground">Así lo verán tus clientes.</p>
      </div>

      {/* Vacía, con sus sellos por llenar: es la promesa, no una simulación de
          un progreso que nadie ha ganado todavía. */}
      <LoyaltyCardPreview
        businessName={borrador.negocio || "Tu negocio"}
        currentStamps={0}
        maxStamps={borrador.sellos}
        reward={borrador.recompensa || "Tu recompensa"}
        brandColor={borrador.color}
        showQR={false}
        className="mx-auto max-w-[300px]"
      />
    </div>
  )
}

function Origen({
  elegido, onElegir,
}: {
  elegido: string | null
  onElegir: (origen: string) => void
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
            key={origen}
            type="button"
            aria-pressed={elegido === origen}
            onClick={() => onElegir(origen)}
            className={cn(
              "flex min-h-11 w-full items-center justify-between rounded-xl border px-4 text-left text-sm transition-colors",
              elegido === origen
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {origen}
            {elegido === origen && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function Paywall({ borrador }: { borrador: Borrador }) {
  const [intento, setIntento] = useState(false)
  // El anual llega seleccionado: es el recomendado y el que regala dos meses.
  const [anual, setAnual] = useState(true)
  const lite = PLANES.find((p) => p.id === "lite")!
  const pro = PLANES.find((p) => p.id === "pro")!
  const cuentaLite = cuentaDelAnual(lite.mensual, lite.anual)
  const cuentaPro = cuentaDelAnual(pro.mensual, pro.anual)
  const precio = (plan: typeof lite) => (anual ? plan.anual : plan.mensual)
  const periodo = anual ? "MXN al año" : "MXN al mes"

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Publica tu tarjeta
        </h1>
        <p className="text-muted-foreground">
          Tu negocio y tu tarjeta ya están guardados. El plan se contrata para publicarla.
        </p>
      </div>

      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Cómo quieres pagar"
          className="inline-flex rounded-full border border-border bg-card p-1"
        >
          {([true, false] as const).map((esAnual) => (
            <button
              key={String(esAnual)}
              type="button"
              role="radio"
              aria-checked={anual === esAnual}
              onClick={() => setAnual(esAnual)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors",
                anual === esAnual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {esAnual ? "Al año" : "Al mes"}
              {esAnual && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", anual ? "bg-white/20" : "bg-primary/15 text-primary")}>
                  2 meses gratis
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Lite lleva el mes de Pro dentro de su propia tarjeta: el beneficio se
            dice donde se decide, no en una nota al pie. */}
        <div className="flex flex-col rounded-2xl border-2 border-primary bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">{lite.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lite.resumen}</p>
          <p className="mt-5 text-3xl font-bold text-foreground">
            ${PESOS.format(precio(lite))}{" "}
            <span className="text-sm font-normal text-muted-foreground">{periodo}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {anual
              ? `Equivale a $${PESOS.format(cuentaLite.porMes)} al mes. Dos meses gratis frente al pago mensual.`
              : `Pagando por año baja a $${PESOS.format(cuentaLite.porMes)} al mes.`}
          </p>
          <p className="mt-4 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            Incluye un mes con todo lo de Pro
          </p>
          <Button
            className="mt-6 min-h-11 w-full"
            onClick={() => setIntento(true)}
          >
            Contratar {lite.nombre}, ${PESOS.format(precio(lite))}
          </Button>
        </div>

        {/* Pro se ve, con su precio y con cuándo se podrá contratar, para que el
            salto no sorprenda al mes siguiente. */}
        <div className="flex flex-col rounded-2xl border border-border bg-muted/30 p-6 opacity-75">
          <h2 className="text-xl font-semibold text-foreground">{pro.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{pro.resumen}</p>
          <p className="mt-5 text-3xl font-bold text-foreground">
            ${PESOS.format(precio(pro))}{" "}
            <span className="text-sm font-normal text-muted-foreground">{periodo}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {anual ? `Equivale a $${PESOS.format(cuentaPro.porMes)} al mes.` : "Sin permanencia."}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Disponible al terminar tu primer mes, que ya viene con todo lo de Pro.
          </p>
        </div>
      </div>

      {intento && (
        <p
          role="alert"
          className="rounded-xl border border-border bg-muted/40 p-4 text-center text-sm text-foreground"
        >
          El cobro todavía no está activo en esta versión. Tu negocio y tu tarjeta quedan
          guardados tal como los dejaste.
        </p>
      )}

      {/* Salir no es un botón escondido. */}
      <div className="text-center">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/dashboard">Salir sin publicar</Link>
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Sin publicar, tu tarjeta no genera código QR y tus clientes todavía no pueden unirse.
        </p>
      </div>
    </div>
  )
}
