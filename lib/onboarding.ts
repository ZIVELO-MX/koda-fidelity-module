/**
 * Cliente del alta guiada contra `/api/onboarding`.
 *
 * La primera versión de esta pantalla guardaba el borrador en `localStorage`
 * porque el backend no tenía dónde ponerlo. Ya lo tiene: `OnboardingProgress`
 * persiste paso, estado, los dos borradores, el origen y la modalidad de cobro,
 * con `draftVersion` para no pisar escrituras. Guardar en el navegador ahora
 * sería mentir: el negocio cambiaría de equipo y se encontraría el alta vacía.
 *
 * Aquí no se decide nada del flujo. El servidor es el dueño del paso y del
 * estado; esto solo lee, guarda y pide avanzar.
 */
export type OnboardingStep = "INTRO" | "BUSINESS" | "CARD" | "ACQUISITION" | "PAYWALL"
export type OnboardingStatus = "IN_PROGRESS" | "AWAITING_PAYMENT" | "ACTIVE"
export type BillingInterval = "MONTHLY" | "ANNUAL"

/** Los valores que acepta el contrato. No son texto libre. */
export const ORIGENES = [
  { valor: "REFERRAL", etiqueta: "Un conocido me lo recomendó" },
  { valor: "SOCIAL", etiqueta: "Lo vi en redes sociales" },
  { valor: "SEARCH", etiqueta: "Lo busqué en internet" },
  { valor: "KODA_POS", etiqueta: "Ya uso Koda POS" },
  { valor: "EVENT", etiqueta: "Lo conocí en un evento" },
  { valor: "OTHER", etiqueta: "Otro" },
] as const

export type AcquisitionSource = (typeof ORIGENES)[number]["valor"]

/** Las opciones de sellos del diseño. Ni un campo libre ni un número al azar. */
export const SELLOS_POSIBLES = [5, 8, 10, 12] as const

export type Categoria = { id: string; name: string }

export type BorradorDeNegocio = { name?: string; categoryId?: string }
export type BorradorDeTarjeta = {
  name?: string
  reward?: string
  stampsRequired?: number
  brandColor?: string
  themeId?: string
}

export type EstadoDelAlta = {
  step: OnboardingStep
  status: OnboardingStatus
  draftVersion: number
  negocio: BorradorDeNegocio
  tarjeta: BorradorDeTarjeta
  acquisitionSource: AcquisitionSource | null
  selectedBillingInterval: BillingInterval | null
  primeraTarjetaId: string | null
  categorias: Categoria[]
  /** Nombre real del negocio, si ya existe en la cuenta. */
  nombreDeLaCuenta: string | null
}

/** Motivo por el que una llamada del alta no se pudo completar. */
export type FalloDelAlta =
  | { tipo: "sesion" }
  | { tipo: "conflicto"; mensaje: string }
  | { tipo: "validacion"; mensaje: string }
  | { tipo: "red" }
  | { tipo: "servidor"; mensaje: string; requestId?: string }

export class ErrorDelAlta extends Error {
  constructor(readonly fallo: FalloDelAlta) {
    super(fallo.tipo === "sesion" ? "Sesión expirada" : "mensaje" in fallo ? fallo.mensaje : "Error del alta")
    this.name = "ErrorDelAlta"
  }
}

const objeto = (valor: unknown): Record<string, unknown> =>
  valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {}

const texto = (valor: unknown): string | undefined => (typeof valor === "string" && valor ? valor : undefined)

function normalizar(cuerpo: unknown): EstadoDelAlta {
  const raiz = objeto(cuerpo)
  const onboarding = objeto(raiz.onboarding)
  const progreso = objeto(onboarding.onboardingProgress)
  if (typeof progreso.draftVersion !== "number") {
    throw new ErrorDelAlta({ tipo: "servidor", mensaje: "La respuesta del alta no trae el progreso." })
  }
  const negocio = objeto(progreso.businessDraft)
  const tarjeta = objeto(progreso.cardDraft)
  const categorias = Array.isArray(raiz.categories) ? raiz.categories : []

  return {
    step: (texto(progreso.step) as OnboardingStep) ?? "INTRO",
    status: (texto(progreso.status) as OnboardingStatus) ?? "IN_PROGRESS",
    draftVersion: progreso.draftVersion,
    negocio: { name: texto(negocio.name), categoryId: texto(negocio.categoryId) },
    tarjeta: {
      name: texto(tarjeta.name),
      reward: texto(tarjeta.reward),
      stampsRequired: typeof tarjeta.stampsRequired === "number" ? tarjeta.stampsRequired : undefined,
      brandColor: texto(tarjeta.brandColor),
      themeId: texto(tarjeta.themeId),
    },
    acquisitionSource: (texto(progreso.acquisitionSource) as AcquisitionSource) ?? null,
    selectedBillingInterval: (texto(progreso.selectedBillingInterval) as BillingInterval) ?? null,
    primeraTarjetaId: texto(progreso.firstCardId) ?? null,
    categorias: categorias
      .map((c) => objeto(c))
      .filter((c) => texto(c.id) && texto(c.name))
      .map((c) => ({ id: String(c.id), name: String(c.name) })),
    nombreDeLaCuenta: texto(objeto(objeto(raiz.accountContext).business).name) ?? null,
  }
}

async function pedir(init: RequestInit & { method: string }): Promise<EstadoDelAlta> {
  let res: Response
  try {
    res = await fetch("/api/onboarding", {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    })
  } catch {
    throw new ErrorDelAlta({ tipo: "red" })
  }

  const cuerpo = await res.json().catch(() => null)

  if (!res.ok) {
    const sobre = objeto(cuerpo)
    const mensaje = texto(sobre.error) ?? "El servidor no pudo completar la operación."
    if (res.status === 401 || res.status === 403) throw new ErrorDelAlta({ tipo: "sesion" })
    if (res.status === 409) throw new ErrorDelAlta({ tipo: "conflicto", mensaje })
    if (res.status === 400 || res.status === 422) throw new ErrorDelAlta({ tipo: "validacion", mensaje })
    throw new ErrorDelAlta({
      tipo: "servidor",
      mensaje,
      requestId: texto(sobre.requestId) ?? res.headers.get("x-request-id") ?? undefined,
    })
  }

  return normalizar(cuerpo)
}

export const leerAlta = () => pedir({ method: "GET" })

export const guardarBorrador = (
  draftVersion: number,
  cambios: {
    business?: BorradorDeNegocio
    card?: BorradorDeTarjeta
    acquisitionSource?: AcquisitionSource | null
    selectedBillingInterval?: BillingInterval | null
  },
) => pedir({ method: "PATCH", body: JSON.stringify({ draftVersion, ...cambios }) })

export type AccionDelAlta =
  | "complete_intro" | "skip_intro" | "complete_business" | "complete_card"
  | "complete_acquisition" | "skip_acquisition" | "select_billing_interval" | "open_paywall"

export const avanzar = (accion: AccionDelAlta, draftVersion: number, billingInterval?: BillingInterval) =>
  pedir({ method: "POST", body: JSON.stringify({ action: accion, draftVersion, billingInterval }) })
