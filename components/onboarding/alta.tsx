"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { BarraDePasos } from "@/components/onboarding/barra-de-pasos"
import { PLANES } from "@/lib/planes"
import { cuentaDelAnual } from "@/lib/precios"
import {
  ErrorDelAlta, ORIGENES, SELLOS_POSIBLES, avanzar, guardarBorrador, leerAlta,
  type AccionDelAlta, type AcquisitionSource, type BillingInterval, type EstadoDelAlta,
} from "@/lib/onboarding"
import { esAcabadoPro, nombreDeTema } from "@/lib/temas-de-tarjeta"
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

type Aviso = { texto: string; reintentable: boolean; requestId?: string } | null

export function Alta() {
  const router = useRouter()
  const [estado, setEstado] = useState<EstadoDelAlta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [ocupado, setOcupado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [laminaIntro, setLaminaIntro] = useState(0)
  // El club es un momento de llegada, no un paso del servidor: se enseña
  // después de que la tarjeta quedó creada, antes de preguntar el origen.
  const [enElClub, setEnElClub] = useState(false)

  /** Traduce un fallo del alta a lo que la pantalla tiene que enseñar. */
  const manejarFallo = useCallback(
    (error: unknown) => {
      if (!(error instanceof ErrorDelAlta)) {
        setAviso({ texto: "Ocurrió algo inesperado.", reintentable: true })
        return
      }
      const f = error.fallo
      if (f.tipo === "sesion") {
        router.replace("/login")
        return
      }
      if (f.tipo === "red") {
        setAviso({ texto: "No hay conexión con el servidor.", reintentable: true })
        return
      }
      if (f.tipo === "conflicto") {
        // Otra pestaña o el otro equipo escribió antes. Se recarga en vez de
        // pisar lo que ya quedó guardado.
        setAviso({ texto: `${f.mensaje} Recargamos lo último guardado.`, reintentable: false })
        void leerAlta().then(setEstado).catch(() => {
          setAviso({ texto: "El borrador cambió y no pudimos releerlo. Recarga la página.", reintentable: true })
        })
        return
      }
      setAviso({
        texto: f.mensaje,
        reintentable: f.tipo === "servidor",
        requestId: f.tipo === "servidor" ? f.requestId : undefined,
      })
    },
    [router],
  )

  const recargar = useCallback(async () => {
    try {
      setEstado(await leerAlta())
      setAviso(null)
    } catch (error) {
      manejarFallo(error)
    }
  }, [manejarFallo])

  useEffect(() => {
    leerAlta()
      .then(setEstado)
      .catch(manejarFallo)
      .finally(() => setCargando(false))
  }, [manejarFallo])

  // Autoguardado: lo escrito viaja al servidor sin pulsar nada, con un respiro
  // para no mandar una petición por tecla.
  const pendiente = useRef<Parameters<typeof guardarBorrador>[1] | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const guardarPronto = useCallback(
    (cambios: Parameters<typeof guardarBorrador>[1]) => {
      pendiente.current = {
        ...(pendiente.current ?? {}),
        ...cambios,
        business: { ...(pendiente.current?.business ?? {}), ...(cambios.business ?? {}) },
        card: { ...(pendiente.current?.card ?? {}), ...(cambios.card ?? {}) },
      }
      if (temporizador.current) clearTimeout(temporizador.current)
      temporizador.current = setTimeout(async () => {
        const porGuardar = pendiente.current
        pendiente.current = null
        if (!porGuardar || !estado) return
        setGuardando(true)
        try {
          setEstado(await guardarBorrador(estado.draftVersion, porGuardar))
          setAviso(null)
        } catch (error) {
          manejarFallo(error)
        } finally {
          setGuardando(false)
        }
      }, 700)
    },
    [estado, manejarFallo],
  )

  /** Guarda lo pendiente y después pide avanzar, para no perder la última tecla. */
  const pedirAvance = useCallback(
    async (accion: AccionDelAlta, intervalo?: BillingInterval) => {
      if (!estado || ocupado) return
      setOcupado(true)
      setAviso(null)
      try {
        let actual = estado
        if (temporizador.current) clearTimeout(temporizador.current)
        if (pendiente.current) {
          const porGuardar = pendiente.current
          pendiente.current = null
          actual = await guardarBorrador(actual.draftVersion, porGuardar)
          setEstado(actual)
        }
        setEstado(await avanzar(accion, actual.draftVersion, intervalo))
      } catch (error) {
        manejarFallo(error)
      } finally {
        setOcupado(false)
      }
    },
    [estado, ocupado, manejarFallo],
  )

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
            {aviso?.texto ?? "No pudimos cargar tu alta."}
          </p>
          <Button className="min-h-11" onClick={() => void recargar()}>
            Reintentar
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
          {aviso && (
            <div
              role="alert"
              className="mx-auto max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center"
            >
              <p className="text-sm text-foreground">{aviso.texto}</p>
              {aviso.requestId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Referencia para soporte: <span className="font-mono">{aviso.requestId}</span>
                </p>
              )}
              {aviso.reintentable && (
                <Button variant="outline" size="sm" className="mt-3 min-h-10" onClick={() => void recargar()}>
                  Reintentar
                </Button>
              )}
            </div>
          )}
          {guardando && (
            <p className="text-center text-xs text-muted-foreground" aria-live="polite">
              Guardando…
            </p>
          )}
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
            <Datos estado={estado} onCambio={guardarPronto} onCambioLocal={setEstado} />
          )}

          {paso === "CARD" && (
            <Tarjeta estado={estado} onCambio={guardarPronto} onCambioLocal={setEstado} />
          )}

          {paso === "ACQUISITION" && enElClub && <Club estado={estado} />}

          {paso === "ACQUISITION" && !enElClub && (
            <Origen
              elegido={estado.acquisitionSource}
              onElegir={(origen) => {
                setEstado({ ...estado, acquisitionSource: origen })
                guardarPronto({ acquisitionSource: origen })
              }}
            />
          )}

          {enPaywall && (
            <Paywall
              estado={estado}
              ocupado={ocupado}
              onIntervalo={(intervalo) => void pedirAvance("select_billing_interval", intervalo)}
            />
          )}
        </main>

        {paso !== "INTRO" && !enPaywall && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <span className="text-xs text-muted-foreground">
              Lo que escribes se guarda solo. Puedes cerrar y volver.
            </span>
            <div className="flex items-center gap-3">
              {paso === "ACQUISITION" && !enElClub && (
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
                disabled={ocupado}
                onClick={() => {
                  if (paso === "BUSINESS") return void pedirAvance("complete_business")
                  if (paso === "CARD") return void pedirAvance("complete_card").then(() => setEnElClub(true))
                  if (enElClub) return setEnElClub(false)
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
    <div className="mx-auto max-w-xl space-y-8 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{lamina.titulo}</h1>
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
        <Button className="min-h-11 w-full px-8 sm:w-auto" disabled={ocupado} onClick={onSiguiente}>
          {indice < total - 1 ? "Siguiente" : "Empezar"}
        </Button>
        <Button variant="ghost" className="min-h-11 w-full sm:w-auto" disabled={ocupado} onClick={onSaltar}>
          Saltar la introducción
        </Button>
      </div>
    </div>
  )
}

function Datos({
  estado, onCambio, onCambioLocal,
}: {
  estado: EstadoDelAlta
  onCambio: (c: { business?: { name?: string; categoryId?: string } }) => void
  onCambioLocal: (e: EstadoDelAlta) => void
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tu negocio</h1>
        <p className="text-muted-foreground">Dos datos y seguimos. Lo demás se configura después.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="negocio">Nombre del negocio</Label>
        <Input
          id="negocio"
          value={estado.negocio.name ?? ""}
          onChange={(e) => {
            onCambioLocal({ ...estado, negocio: { ...estado.negocio, name: e.target.value } })
            onCambio({ business: { name: e.target.value } })
          }}
          placeholder="Café Aurora"
          maxLength={120}
          autoFocus
        />
      </div>

      {/* Las categorías vienen del backend con su identificador: la interfaz no
          inventa una lista propia que el servidor luego no reconoce. */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {estado.categorias.map((categoria) => {
            const elegida = estado.negocio.categoryId === categoria.id
            return (
              <button
                key={categoria.id}
                type="button"
                aria-pressed={elegida}
                onClick={() => {
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

function Tarjeta({
  estado, onCambio, onCambioLocal,
}: {
  estado: EstadoDelAlta
  onCambio: (c: { card?: { reward?: string; stampsRequired?: number; brandColor?: string; themeId?: string } }) => void
  onCambioLocal: (e: EstadoDelAlta) => void
}) {
  const sellos = estado.tarjeta.stampsRequired ?? 10
  const color = estado.tarjeta.brandColor ?? "#ff6b35"

  const elegido = estado.temas.find((t) => t.id === estado.tarjeta.themeId)
  // El plan de la cuenta decide si el acabado Pro se llega a ver. La selección
  // se guarda igual: probarlo es parte de lo que empuja a contratar.
  const temaEfectivo = elegido && (elegido.plan === "LITE" || estado.plan === "PRO") ? elegido.code : null
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
            value={estado.tarjeta.reward ?? ""}
            onChange={(e) => {
              onCambioLocal({ ...estado, tarjeta: { ...estado.tarjeta, reward: e.target.value } })
              onCambio({ card: { reward: e.target.value } })
            }}
            placeholder="Décimo café gratis"
            maxLength={240}
          />
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
          currentStamps={0}
          maxStamps={sellos}
          reward={estado.tarjeta.reward || "Tu recompensa"}
          brandColor={color}
          themeCode={temaEfectivo}
          showQR={false}
          className="mx-auto max-w-[300px]"
        />
      </div>
    </div>
  )
}

function Club({ estado }: { estado: EstadoDelAlta }) {
  const nombre = estado.negocio.name || estado.nombreDeLaCuenta || "de tu negocio"
  return (
    <div className="mx-auto max-w-md space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Club {nombre}</h1>
        <p className="text-muted-foreground">Así lo verán tus clientes.</p>
      </div>

      {/* Vacía, con sus sellos por llenar: es la promesa, no una simulación de
          un progreso que nadie ha ganado todavía. */}
      <LoyaltyCardPreview
        businessName={estado.negocio.name || "Tu negocio"}
        currentStamps={0}
        maxStamps={estado.tarjeta.stampsRequired ?? 10}
        reward={estado.tarjeta.reward || "Tu recompensa"}
        brandColor={estado.tarjeta.brandColor ?? "#ff6b35"}
        showQR={false}
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
          brandColor={estado.tarjeta.brandColor ?? "#ff6b35"}
          themeCode={temaEfectivo}
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
  estado, ocupado, onIntervalo,
}: {
  estado: EstadoDelAlta
  ocupado: boolean
  onIntervalo: (intervalo: BillingInterval) => void
}) {
  const [intento, setIntento] = useState(false)
  // El anual llega seleccionado: es el recomendado y el que regala dos meses.
  const anual = (estado.selectedBillingInterval ?? "ANNUAL") === "ANNUAL"
  const lite = PLANES.find((p) => p.id === "lite")!
  const pro = PLANES.find((p) => p.id === "pro")!
  const cuentaLite = cuentaDelAnual(lite.mensual, lite.anual)
  const cuentaPro = cuentaDelAnual(pro.mensual, pro.anual)
  const precio = (plan: typeof lite) => (anual ? plan.anual : plan.mensual)
  const periodo = anual ? "MXN al año" : "MXN al mes"

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Publica tu tarjeta</h1>
        <p className="text-muted-foreground">
          Tu negocio y tu tarjeta ya están guardados en tu cuenta. El plan se contrata para publicarla.
        </p>
      </div>

      <TarjetaGuardada estado={estado} />

      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Cómo quieres pagar" className="inline-flex rounded-full border border-border bg-card p-1">
          {([["ANNUAL", "Al año"], ["MONTHLY", "Al mes"]] as const).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={(valor === "ANNUAL") === anual}
              disabled={ocupado}
              onClick={() => onIntervalo(valor)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors",
                (valor === "ANNUAL") === anual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {etiqueta}
              {valor === "ANNUAL" && (
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
            ${PESOS.format(precio(lite))} <span className="text-sm font-normal text-muted-foreground">{periodo}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {anual
              ? `Equivale a $${PESOS.format(cuentaLite.porMes)} al mes. Dos meses gratis frente al pago mensual.`
              : `Pagando por año baja a $${PESOS.format(cuentaLite.porMes)} al mes.`}
          </p>
          <p className="mt-4 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            Incluye un mes con todo lo de Pro
          </p>
          <Button className="mt-6 min-h-11 w-full" onClick={() => setIntento(true)}>
            Contratar {lite.nombre}, ${PESOS.format(precio(lite))}
          </Button>
        </div>

        {/* Pro se ve, con su precio y con cuándo se podrá contratar, para que el
            salto no sorprenda al mes siguiente. */}
        <div className="flex flex-col rounded-2xl border border-border bg-muted/30 p-6 opacity-75">
          <h2 className="text-xl font-semibold text-foreground">{pro.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{pro.resumen}</p>
          <p className="mt-5 text-3xl font-bold text-foreground">
            ${PESOS.format(precio(pro))} <span className="text-sm font-normal text-muted-foreground">{periodo}</span>
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
        <p role="alert" className="rounded-xl border border-border bg-muted/40 p-4 text-center text-sm text-foreground">
          El cobro todavía no está activo en esta versión. Tu negocio y tu tarjeta quedan guardados tal como
          los dejaste.
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
