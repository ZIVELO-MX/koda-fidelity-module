"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react"

const steps = [
  { id: 1, name: "Datos", description: "Nombre y recompensa" },
  { id: 2, name: "Diseño", description: "Colores y marca" },
  { id: 3, name: "Revisión", description: "Vista previa y crear" },
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
    businessName: "Tu Negocio",
  })

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
    if (currentStep < 3) setCurrentStep(currentStep + 1)
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
          description: formData.description || undefined,
          expiresAt: formData.expirationDate || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear la tarjeta")
      }

      router.push("/dashboard/cards")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear la tarjeta")
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
          Back to Cards
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Crear Tarjeta de Lealtad</h1>
        <p className="text-muted-foreground">Configura una nueva tarjeta de lealtad en pocos pasos</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-md">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-16 sm:w-24 mx-2 mt-[-24px] ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
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
                    placeholder="Ej: Café Rewards"
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
                    placeholder="Ej: Café Gratis"
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
                  <div className="flex items-center gap-3">
                    {[5, 8, 10, 12, 15].map((num) => (
                      <button
                        key={num}
                        onClick={() => updateFormData("maxStamps", num)}
                        className={`w-12 h-12 rounded-xl font-semibold transition-all ${
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
                  <Label htmlFor="expirationDate">Fecha de Vencimiento (opcional)</Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => updateFormData("expirationDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Agrega detalles sobre tu programa de lealtad..."
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
                    placeholder="Nombre de tu Negocio"
                    value={formData.businessName}
                    onChange={(e) => updateFormData("businessName", e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Color de Marca</Label>
                  <div className="grid grid-cols-6 gap-3">
                    {colorPresets.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateFormData("brandColor", color.value)}
                        className={`w-full aspect-square rounded-xl transition-all ${
                          formData.brandColor === color.value
                            ? "ring-2 ring-offset-2 ring-foreground scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Label htmlFor="customColor" className="text-sm text-muted-foreground">
                      Personalizado:
                    </Label>
                    <input
                      type="color"
                      id="customColor"
                      value={formData.brandColor}
                      onChange={(e) => updateFormData("brandColor", e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={formData.brandColor}
                      onChange={(e) => updateFormData("brandColor", e.target.value)}
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Revisión y Creación</h2>
                <p className="text-sm text-muted-foreground">
                  Asegúrate de que todo esté correcto antes de crear tu tarjeta
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nombre de Tarjeta</span>
                    <span className="text-sm font-medium text-foreground">
                      {formData.cardName || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Recompensa</span>
                    <span className="text-sm font-medium text-foreground">
                      {formData.reward || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sellos Requeridos</span>
                    <span className="text-sm font-medium text-foreground">{formData.maxStamps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nombre del Negocio</span>
                    <span className="text-sm font-medium text-foreground">{formData.businessName}</span>
                  </div>
                  {formData.expirationDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Vence</span>
                      <span className="text-sm font-medium text-foreground">{formData.expirationDate}</span>
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
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Atrás
            </Button>
            {currentStep < 3 ? (
              <Button onClick={nextStep}>
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={saving}>
                <Check className="h-4 w-4 mr-2" />
                {saving ? "Creando..." : "Crear Tarjeta"}
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-muted/30 rounded-2xl p-8 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-6 text-center">
              Vista Previa
            </h3>
            <LoyaltyCardPreview
              businessName={formData.businessName || "Tu Negocio"}
              customerName="Cliente Feliz"
              currentStamps={Math.floor(formData.maxStamps * 0.6)}
              maxStamps={formData.maxStamps}
              reward={formData.reward || "Tu Recompensa"}
              expirationDate={formData.expirationDate ? new Date(formData.expirationDate).toLocaleDateString("es-US", { month: "short", day: "numeric", year: "numeric" }) : undefined}
              brandColor={formData.brandColor}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
