"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { getRarityColor, getRarityLabel, getRarityDescription, getRarityRange } from "@/lib/card-utils"
import { cn } from "@/lib/utils"
import { ExpirationPicker } from "@/components/dashboard/expiration-picker"

const steps = [
  { id: 1, name: "Datos", description: "Nombre y recompensa" },
  { id: 2, name: "Diseño", description: "Colores y marca" },
  { id: 3, name: "Sorpresas", description: "Bonos en el camino" },
  { id: 4, name: "Revisión", description: "Vista previa y crear" },
]

const colorPresets = [
  { name: "Naranja", value: "#f97316" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Púrpura", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Ámbar", value: "#f59e0b" },
]

export default function CreateCardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    cardName: "",
    reward: "",
    maxStamps: 10,
    expirationDate: "",
    description: "",
    brandColor: "#f97316",
    businessName: "",
  })
  const [iconName, setIconName] = useState<string | null>(null)
  const [stampIconName, setStampIconName] = useState<string | null>(null)
  const [businessLogo, setBusinessLogo] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"normal" | "sellada">("normal")
  const [milestones, setMilestones] = useState<{ stampNumber: number; label: string; iconName: string | null; probability: number }[]>([])

  useEffect(() => {
    fetch("/api/business")
      .then((res) => res.json())
      .then((data) => {
        if (data.business) {
          setFormData((prev) => ({
            ...prev,
            businessName: data.business.name || "",
            brandColor: data.business.brandColor || "#f97316",
          }))
          setIconName(data.business.iconName || null)
          setStampIconName(data.business.stampIconName || null)
          setBusinessLogo(data.business.logoUrl || null)
        }
      })
      .catch(() => {})
  }, [])

  const updateFormData = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    if (step === 1) {
      if (!formData.cardName.trim()) newErrors.cardName = "El nombre de la tarjeta es obligatorio"
      if (!formData.reward.trim()) newErrors.reward = "La recompensa es obligatoria"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (!validateStep(currentStep)) return
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.cardName,
          reward: formData.reward,
          stampsRequired: formData.maxStamps,
          brandColor: formData.brandColor,
          iconName: iconName || undefined,
          stampIconName: stampIconName || undefined,
          description: formData.description || undefined,
          expiresAt: formData.expirationDate || undefined,
          milestoneRewards: milestones.map(m => ({
            stampNumber: m.stampNumber,
            label: m.label,
            iconName: m.iconName,
            probability: m.probability,
          })),
        }),
      })

      if (!res.ok) {
        throw new Error("No fue posible crear la tarjeta")
      }

      router.push("/dashboard/cards")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la tarjeta")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/cards"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a tarjetas
        </Link>
        <h1 className="text-2xl font-bold text-foreground text-balance">Crear Tarjeta de Lealtad</h1>
        <p className="text-muted-foreground">Configura una nueva tarjeta de lealtad en pocos pasos</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex w-full items-center justify-center sm:justify-between sm:max-w-md">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${currentStep === step.id ? "scale-110 sm:scale-100" : ""} transition-transform`}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex w-8 h-8 sm:w-10 sm:h-10 items-center justify-center rounded-full font-semibold transition-all text-xs sm:text-base shrink-0 ${
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-1 sm:mt-2 text-center">
                  <p className={`text-[11px] sm:text-sm font-medium whitespace-nowrap ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.name}
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-1 sm:mx-2 mt-3 sm:mt-5 h-0.5 w-4 sm:w-10 shrink-0 rounded-full ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          {/* Step 1: Basics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Datos de la Tarjeta</h2>
                <p className="text-sm text-muted-foreground">
                  ¿Qué ganarán los clientes con esta tarjeta?
                </p>
              </div>

              <div className="space-y-4">
                  <div className="space-y-2">
                  <Label htmlFor="cardName">Nombre de la Tarjeta</Label>
                  <Input
                    id="cardName"
                    name="cardName"
                    placeholder="Ej.: Recompensas Café"
                    value={formData.cardName}
                    onChange={(e) => { updateFormData("cardName", e.target.value); setErrors((prev) => ({ ...prev, cardName: "" })) }}
                    aria-invalid={!!errors.cardName}
                  />
                  {errors.cardName && <p className="text-sm text-red-500">{errors.cardName}</p>}
                  <p className="text-xs text-muted-foreground">
                    Este es el nombre que los clientes verán en su tarjeta
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reward">Recompensa</Label>
                  <Input
                    id="reward"
                    name="reward"
                    placeholder="Ej.: Café Gratis"
                    value={formData.reward}
                    onChange={(e) => { updateFormData("reward", e.target.value); setErrors((prev) => ({ ...prev, reward: "" })) }}
                    aria-invalid={!!errors.reward}
                  />
                  {errors.reward && <p className="text-sm text-red-500">{errors.reward}</p>}
                  <p className="text-xs text-muted-foreground">
                    ¿Qué obtienen los clientes al completar la tarjeta?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStamps">Sellos Requeridos</Label>
                  <div className="grid grid-cols-5 gap-2 sm:flex sm:items-center sm:gap-3">
                    {[5, 8, 10, 12, 15].map((num) => (
                      <button
                        key={num}
                        type="button"
                        aria-pressed={formData.maxStamps === num}
                        onClick={() => updateFormData("maxStamps", num)}
                        className={`h-11 rounded-xl font-semibold transition-[background-color,color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-12 sm:w-12 ${
                          formData.maxStamps === num
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ¿Cuántos sellos para ganar la recompensa?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Vencimiento <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                  <ExpirationPicker
                    value={formData.expirationDate}
                    onChange={(v) => updateFormData("expirationDate", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Agrega detalles sobre tu programa de lealtad…"
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Design */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Diseño de Tarjeta</h2>
                <p className="text-sm text-muted-foreground">
                  Personaliza la apariencia de tu tarjeta de lealtad
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del Negocio</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    placeholder="Nombre de tu Negocio"
                    value={formData.businessName}
                    onChange={(e) => updateFormData("businessName", e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Color de Marca</Label>
                  <div className="grid grid-cols-6 gap-3">
                    {colorPresets.map((color) => (
                      <Tooltip key={color.value}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => updateFormData("brandColor", color.value)}
                            aria-label={color.name}
                            aria-pressed={formData.brandColor === color.value}
                            className={`aspect-square w-full rounded-xl transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                              formData.brandColor === color.value
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
                      value={formData.brandColor}
                      onChange={(e) => updateFormData("brandColor", e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      name="brandColor"
                      value={formData.brandColor}
                      onChange={(e) => updateFormData("brandColor", e.target.value)}
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Ícono de tarjeta <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                  <IconPicker value={iconName} onChange={setIconName} businessLogoUrl={businessLogo} />
                </div>

                <div className="space-y-3">
                  <Label>Ícono del sello <span className="text-xs text-muted-foreground font-normal">(opcional — por defecto igual al de tarjeta)</span></Label>
                  <IconPicker value={stampIconName} onChange={setStampIconName} businessLogoUrl={businessLogo} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Surprises */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Recompensas Sorpresa</h2>
                <p className="text-sm text-muted-foreground">
                  Bonos con probabilidad al alcanzar posiciones específicas de sellos
                </p>
              </div>

              <div className="space-y-2">
                {Array.from({ length: formData.maxStamps }, (_, i) => i + 1).map((pos) => {
                  const mi = milestones.findIndex((ms) => ms.stampNumber === pos)
                  const isActive = mi !== -1
                  const m = isActive ? milestones[mi] : null
                  return (
                    <div key={pos} className="overflow-hidden rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setMilestones((prev) => prev.filter((x) => x.stampNumber !== pos))
                          } else {
                            setMilestones((prev) => {
                              if (prev.some((x) => x.stampNumber === pos)) return prev
                              return [...prev, { stampNumber: pos, label: "", iconName: null, probability: 100 }]
                            })
                          }
                        }}
                        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                      >
                        <span className="font-medium">Sello #{pos}</span>
                        <Switch
                          checked={isActive}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMilestones((prev) => {
                                if (prev.some((x) => x.stampNumber === pos)) return prev
                                return [...prev, { stampNumber: pos, label: "", iconName: null, probability: 100 }]
                              })
                            } else {
                              setMilestones((prev) => prev.filter((x) => x.stampNumber !== pos))
                            }
                          }}
                        />
                      </button>
                      <div
                        className={`grid transition-all duration-300 ${
                          isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(11rem,1fr)] sm:items-end">
                              <div className="min-w-[120px] flex-1 space-y-1.5">
                                <Label className="text-xs">Recompensa</Label>
                                <Input
                                  value={m?.label ?? ""}
                                  onChange={(e) =>
                                    setMilestones((prev) =>
                                      prev.map((x, j) => (j === mi ? { ...x, label: e.target.value } : x)),
                                    )
                                  }
                                  placeholder="Ej.: Café gratis"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Ícono</Label>
                                <IconPicker
                                  value={m?.iconName ?? null}
                                  onChange={(v) =>
                                    setMilestones((prev) =>
                                      prev.map((x, j) => (j === mi ? { ...x, iconName: v } : x)),
                                    )
                                  }
                                  businessLogoUrl={businessLogo}
                                />
                              </div>
                              <div className="min-w-[180px] space-y-1.5">
                                <Label className="text-xs">Probabilidad</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={m?.probability ?? 100}
                                    onChange={(e) =>
                                      setMilestones((prev) =>
                                        prev.map((x, j) =>
                                          j === mi ? { ...x, probability: Number(e.target.value) } : x,
                                        ),
                                      )
                                    }
                                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full border-2"
                                    style={{
                                      accentColor: getRarityColor(m?.probability ?? 100),
                                      borderColor: getRarityColor(m?.probability ?? 100),
                                    }}
                                  />
                                  <span className="w-10 text-right font-mono text-sm">{m?.probability ?? 100}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: getRarityColor(m?.probability ?? 100) }} />
                                  <span className="w-20 shrink-0 font-medium">{getRarityLabel(m?.probability ?? 100)}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="w-14 shrink-0 text-right text-muted-foreground">
                                        {getRarityRange(m?.probability ?? 100)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{getRarityDescription(m?.probability ?? 100)}</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Revisión y Creación</h2>
                <p className="text-sm text-muted-foreground">
                  Asegúrate de que todo esté correcto antes de crear tu tarjeta
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Nombre de Tarjeta</span>
                    <span className="min-w-0 break-words text-right text-sm font-medium text-foreground">
                      {formData.cardName || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Recompensa</span>
                    <span className="min-w-0 break-words text-right text-sm font-medium text-foreground">
                      {formData.reward || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Sellos Requeridos</span>
                    <span className="text-sm font-medium text-foreground">{formData.maxStamps}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Nombre del Negocio</span>
                    <span className="min-w-0 break-words text-right text-sm font-medium text-foreground">{formData.businessName}</span>
                  </div>
                  {formData.expirationDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Vence</span>
                      <span className="text-sm font-medium text-foreground">
                        {new Date(formData.expirationDate + "T12:00:00").toLocaleDateString("es-MX")}
                      </span>
                    </div>
                  )}
                  {milestones.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Recompensas sorpresa</span>
                      <span className="text-sm font-medium text-foreground">
                        {milestones.length} configurada{milestones.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-primary/10 rounded-xl p-4 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">¡Listo para crear!</p>
                    <p className="text-xs text-muted-foreground">
                      Después de crear, obtendrás un código QR que los clientes pueden escanear para unirse a tu programa de lealtad.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Atrás
            </Button>
            {currentStep < 4 ? (
              <Button type="button" onClick={nextStep}>
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleCreate} disabled={saving}>
                <Check className="h-4 w-4 mr-2" />
                {saving ? "Creando…" : "Crear Tarjeta"}
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-muted/30 rounded-2xl p-8 border border-border">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Vista Previa</h3>
              <div className="flex w-full overflow-hidden rounded-lg border border-border text-xs sm:w-auto">
                <button
                  type="button"
                  aria-pressed={previewMode === "normal"}
                  onClick={() => setPreviewMode("normal")}
                  className={`flex-1 px-3 py-1.5 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none ${previewMode === "normal" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  aria-pressed={previewMode === "sellada"}
                  onClick={() => setPreviewMode("sellada")}
                  className={`flex-1 px-3 py-1.5 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none ${previewMode === "sellada" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  Sellada
                </button>
              </div>
            </div>
            <LoyaltyCardPreview
              businessName={formData.businessName || "Tu Negocio"}
              businessLogo={businessLogo ?? undefined}
              iconName={iconName}
              stampIconName={stampIconName}
              customerName="Cliente Feliz"
              currentStamps={previewMode === "sellada" ? formData.maxStamps : Math.floor(formData.maxStamps * 0.6)}
              maxStamps={formData.maxStamps}
              reward={formData.reward || "Tu Recompensa"}
              expirationDate={formData.expirationDate ? new Date(formData.expirationDate + "T12:00:00").toLocaleDateString("es-MX") : undefined}
              brandColor={formData.brandColor}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
