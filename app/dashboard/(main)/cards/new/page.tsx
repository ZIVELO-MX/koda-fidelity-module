"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { ArrowLeft, Check, ChevronDown, Plus, Trash2 } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { getRarityColor, getRarityLabel, getRarityDescription, getRarityRange } from "@/lib/card-utils"
import { sorpresasQueViajan, validarBorrador, type Sorpresa } from "@/lib/tarjeta-borrador"
import { ExpirationPicker } from "@/components/dashboard/expiration-picker"

const colorPresets = [
  { name: "Naranja", value: "#f97316" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Púrpura", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Ámbar", value: "#f59e0b" },
]

const SELLOS_SUGERIDOS = [5, 8, 10, 12, 15]

export default function CreateCardPage() {
  const router = useRouter()

  // Tres decisiones. Todo lo demás tiene un valor por defecto que sirve.
  const [cardName, setCardName] = useState("")
  const [reward, setReward] = useState("")
  const [maxStamps, setMaxStamps] = useState(10)

  // Opciones adicionales.
  const [description, setDescription] = useState("")
  const [expirationDate, setExpirationDate] = useState("")
  const [brandColor, setBrandColor] = useState("#f97316")
  const [iconName, setIconName] = useState<string | null>(null)
  const [stampIconName, setStampIconName] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<Sorpresa[]>([])

  // La marca se hereda del negocio y no se pregunta. El nombre no viaja en el
  // POST: es del negocio, no de la tarjeta.
  const [businessName, setBusinessName] = useState("")
  const [businessLogo, setBusinessLogo] = useState<string | null>(null)
  const [marcaHeredada, setMarcaHeredada] = useState(true)

  const [previewMode, setPreviewMode] = useState<"normal" | "sellada">("normal")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/business")
      .then((res) => res.json())
      .then((data) => {
        if (!data.business) return
        setBusinessName(data.business.name || "")
        setBrandColor(data.business.brandColor || "#f97316")
        setIconName(data.business.iconName || null)
        setStampIconName(data.business.stampIconName || null)
        setBusinessLogo(data.business.logoUrl || null)
      })
      .catch(() => {})
  }, [])

  const limpiarError = (campo: string) => setErrors((prev) => ({ ...prev, [campo]: "" }))

  const cambiarSorpresa = (i: number, cambios: Partial<Sorpresa>) => {
    setMilestones((prev) => prev.map((s, j) => (j === i ? { ...s, ...cambios } : s)))
    limpiarError(`sorpresa-${i}`)
  }

  const añadirSorpresa = () => {
    setMilestones((prev) => {
      const ocupados = new Set(prev.map((s) => s.stampNumber))
      const libre = Array.from({ length: maxStamps }, (_, i) => i + 1).find((n) => !ocupados.has(n))
      return [...prev, { stampNumber: libre ?? 1, label: "", iconName: null, probability: 100 }]
    })
  }

  const handleCreate = async () => {
    const borrador = {
      nombre: cardName,
      recompensa: reward,
      sellosRequeridos: maxStamps,
      sorpresas: milestones,
    }
    const { errores, primerCampo } = validarBorrador(borrador)
    setErrors(errores)
    if (primerCampo) {
      document.getElementById(primerCampo)?.focus()
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cardName.trim(),
          reward: reward.trim(),
          stampsRequired: maxStamps,
          brandColor,
          iconName: iconName || undefined,
          stampIconName: stampIconName || undefined,
          description: description || undefined,
          expiresAt: expirationDate || undefined,
          // Una sorpresa sin etiqueta es una fila que nadie llenó.
          milestoneRewards: sorpresasQueViajan(milestones),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        // El servidor ya explicó qué pasó. Sustituirlo por un texto genérico
        // dejaba a quien publica sin saber qué corregir.
        throw new Error(data?.error || "No fue posible crear la tarjeta")
      }

      // Se termina en el código de la tarjeta, que es lo que hay que compartir
      // para que alguien se inscriba, no en el inventario.
      router.push(`/dashboard/qr-codes/${data.card.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la tarjeta")
    } finally {
      setSaving(false)
    }
  }

  const resumenDeDefectos = [
    expirationDate ? "Con vencimiento" : "Sin vencimiento",
    marcaHeredada ? "Color y logo del negocio" : "Marca personalizada",
    milestones.length > 0
      ? `${milestones.length} sorpresa${milestones.length !== 1 ? "s" : ""}`
      : "Sin sorpresas",
  ].join(" · ")

  return (
    <div className="min-h-[calc(100vh-100px)]">
      <div className="mb-8">
        <Link
          href="/dashboard/cards"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a tarjetas
        </Link>
        <h1 className="text-2xl font-bold text-foreground text-balance">Crear tarjeta</h1>
        <p className="text-muted-foreground">
          Tres decisiones y ya se publica. El resto tiene valores que funcionan.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="recompensa">¿Qué se lleva el cliente?</Label>
              <Input
                id="recompensa"
                name="reward"
                placeholder="Ej.: un café gratis"
                value={reward}
                onChange={(e) => { setReward(e.target.value); limpiarError("recompensa") }}
                aria-invalid={!!errors.recompensa}
                aria-describedby={errors.recompensa ? "error-recompensa" : undefined}
              />
              {errors.recompensa && (
                <p id="error-recompensa" role="alert" className="text-sm text-destructive">
                  {errors.recompensa}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellosRequeridos">¿Cuántos sellos hacen falta?</Label>
              <div className="grid grid-cols-5 gap-2 sm:flex sm:items-center sm:gap-3">
                {SELLOS_SUGERIDOS.map((num, i) => (
                  <button
                    key={num}
                    id={i === 0 ? "sellosRequeridos" : undefined}
                    type="button"
                    aria-pressed={maxStamps === num}
                    onClick={() => setMaxStamps(num)}
                    className={`min-h-11 rounded-xl font-semibold transition-[background-color,color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-12 ${
                      maxStamps === num
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">¿Cómo se llama la tarjeta?</Label>
              <Input
                id="nombre"
                name="cardName"
                placeholder="Ej.: Recompensas Café"
                value={cardName}
                onChange={(e) => { setCardName(e.target.value); limpiarError("nombre") }}
                aria-invalid={!!errors.nombre}
                aria-describedby={errors.nombre ? "error-nombre" : undefined}
              />
              {errors.nombre && (
                <p id="error-nombre" role="alert" className="text-sm text-destructive">
                  {errors.nombre}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Es lo que el cliente ve en su tarjeta.</p>
            </div>
          </div>

          {/* Todo lo que ya tiene un valor que sirve vive aquí, y el resumen dice
              cuál se está aplicando sin obligar a abrirlo. */}
          <details className="group rounded-2xl border border-border bg-card">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block font-medium text-foreground">Opciones adicionales</span>
                <span className="block text-xs text-muted-foreground">{resumenDeDefectos}</span>
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="space-y-6 border-t border-border p-6">
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detalles del programa, si hacen falta"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Vencimiento</Label>
                <ExpirationPicker value={expirationDate} onChange={setExpirationDate} />
              </div>

              <div className="space-y-3">
                <Label>Color de marca</Label>
                <div className="grid grid-cols-6 gap-3">
                  {colorPresets.map((color) => (
                    <Tooltip key={color.value}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => { setBrandColor(color.value); setMarcaHeredada(false) }}
                          aria-label={color.name}
                          aria-pressed={brandColor === color.value}
                          className={`aspect-square w-full rounded-xl transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                            brandColor === color.value
                              ? "ring-2 ring-offset-2 ring-foreground scale-110"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.value }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">{color.name}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:flex sm:items-center">
                  <Label htmlFor="customColor" className="text-sm text-muted-foreground">
                    Personalizado:
                  </Label>
                  <input
                    type="color"
                    id="customColor"
                    name="customColor"
                    value={brandColor}
                    onChange={(e) => { setBrandColor(e.target.value); setMarcaHeredada(false) }}
                    className="h-10 w-10 cursor-pointer rounded-lg border-0"
                  />
                  <Input
                    name="brandColor"
                    aria-label="Color de marca en hexadecimal"
                    value={brandColor}
                    onChange={(e) => { setBrandColor(e.target.value); setMarcaHeredada(false) }}
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Ícono de la tarjeta</Label>
                {/* El logo es una opción del selector, no un campo aparte, y la
                    etiqueta nunca lo decía: había que abrirlo para descubrirlo. */}
                <p className="text-xs text-muted-foreground">
                  {businessLogo
                    ? "Ábrelo para elegir el logo de tu negocio o un ícono."
                    : "Sube el logo en Marca para poder usarlo aquí."}
                </p>
                <IconPicker value={iconName} onChange={(v) => { setIconName(v); setMarcaHeredada(false) }} businessLogoUrl={businessLogo} />
              </div>

              <div className="space-y-3">
                <Label>Ícono del sello</Label>
                <p className="text-xs text-muted-foreground">
                  Si no eliges uno, se usa el de la tarjeta.
                </p>
                <IconPicker value={stampIconName} onChange={(v) => { setStampIconName(v); setMarcaHeredada(false) }} businessLogoUrl={businessLogo} />
              </div>

              {/* Lista de las sorpresas configuradas. Antes había una fila por
                  cada sello de la tarjeta, estuviera o no en uso. */}
              <div className="space-y-3">
                <div>
                  <Label>Recompensas sorpresa</Label>
                  <p className="text-xs text-muted-foreground">
                    Bonos que caen con probabilidad al llegar a un sello.
                  </p>
                </div>

                {milestones.length === 0 && (
                  <p className="text-sm text-muted-foreground">Ninguna configurada.</p>
                )}

                {milestones.map((m, i) => (
                  <div key={i} className="space-y-3 rounded-xl border border-border p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`sorpresa-${i}`} className="text-xs">En el sello</Label>
                        <select
                          id={`sorpresa-${i}`}
                          value={m.stampNumber}
                          onChange={(e) => cambiarSorpresa(i, { stampNumber: Number(e.target.value) })}
                          aria-invalid={!!errors[`sorpresa-${i}`]}
                          className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {Array.from({ length: maxStamps }, (_, k) => k + 1).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setMilestones((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Quitar la sorpresa del sello ${m.stampNumber}`}
                        className="min-h-11 text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {errors[`sorpresa-${i}`] && (
                      <p role="alert" className="text-sm text-destructive">{errors[`sorpresa-${i}`]}</p>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor={`sorpresa-${i}-label`} className="text-xs">Recompensa</Label>
                      <Input
                        id={`sorpresa-${i}-label`}
                        value={m.label}
                        onChange={(e) => cambiarSorpresa(i, { label: e.target.value })}
                        placeholder="Ej.: postre gratis"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Ícono</Label>
                      <IconPicker
                        value={m.iconName}
                        onChange={(v) => cambiarSorpresa(i, { iconName: v })}
                        businessLogoUrl={businessLogo}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`sorpresa-${i}-prob`} className="text-xs">Probabilidad</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id={`sorpresa-${i}-prob`}
                          type="range"
                          min={0}
                          max={100}
                          value={m.probability}
                          onChange={(e) => cambiarSorpresa(i, { probability: Number(e.target.value) })}
                          className="h-2 flex-1 cursor-pointer appearance-none rounded-full border-2"
                          style={{
                            accentColor: getRarityColor(m.probability),
                            borderColor: getRarityColor(m.probability),
                          }}
                        />
                        <span className="w-10 text-right font-mono text-sm">{m.probability}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: getRarityColor(m.probability) }}
                        />
                        <span className="w-20 shrink-0 font-medium">{getRarityLabel(m.probability)}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="w-14 shrink-0 text-right text-muted-foreground">
                              {getRarityRange(m.probability)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">{getRarityDescription(m.probability)}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={añadirSorpresa}
                  disabled={milestones.length >= maxStamps}
                  className="min-h-11 w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir sorpresa
                </Button>
              </div>
            </div>
          </details>
        </div>

        {/* La vista previa es la revisión: no hay un cuarto paso que repita en
            texto lo que ya se ve aquí. */}
        <div className="h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-muted/30 p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Así queda</h2>
              <div className="flex w-full overflow-hidden rounded-lg border border-border text-xs sm:w-auto">
                {(["normal", "sellada"] as const).map((modo) => (
                  <button
                    key={modo}
                    type="button"
                    aria-pressed={previewMode === modo}
                    onClick={() => setPreviewMode(modo)}
                    className={`min-h-10 flex-1 px-3 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none ${
                      previewMode === modo
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {modo === "normal" ? "A medias" : "Completa"}
                  </button>
                ))}
              </div>
            </div>

            <LoyaltyCardPreview
              businessName={businessName || "Tu negocio"}
              businessLogo={businessLogo ?? undefined}
              iconName={iconName}
              stampIconName={stampIconName}
              customerName="Cliente Feliz"
              currentStamps={previewMode === "sellada" ? maxStamps : Math.floor(maxStamps * 0.6)}
              maxStamps={maxStamps}
              reward={reward || "Tu recompensa"}
              expirationDate={
                expirationDate
                  ? new Date(expirationDate + "T12:00:00").toLocaleDateString("es-MX")
                  : undefined
              }
              brandColor={brandColor}
            />

            <Button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="mt-6 min-h-11 w-full"
            >
              <Check className="mr-2 h-4 w-4" />
              {saving ? "Publicando…" : "Publicar tarjeta"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Al publicar llegas al código QR que comparten tus clientes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
