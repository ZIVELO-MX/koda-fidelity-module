"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { ExpirationPicker } from "@/components/dashboard/expiration-picker"
import { toast } from "sonner"
import { getRarityColor, getRarityDescription, getRarityLabel, getRarityRange } from "@/lib/card-utils"
import { sorpresasQueViajan, validarBorrador } from "@/lib/tarjeta-borrador"
import { cn } from "@/lib/utils"

const colorPresets = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"]

const SELLOS_SUGERIDOS = [5, 8, 10, 12, 15]

type MilestoneEdit = {
  id?: string
  stampNumber: number
  label: string
  iconName: string | null
  probability: number
}

interface EditCardFormProps {
  cardId: string
  businessName: string
  businessLogo?: string | null
  initialName: string
  initialReward: string
  initialColor: string
  initialStampsRequired: number
  initialIcon?: string | null
  initialStampIcon?: string | null
  initialDescription?: string | null
  initialExpiresAt?: string | null
  initialMilestones?: MilestoneEdit[]
}

export function EditCardForm({
  cardId,
  businessName,
  businessLogo,
  initialName,
  initialReward,
  initialColor,
  initialStampsRequired,
  initialIcon = null,
  initialStampIcon = null,
  initialDescription = null,
  initialExpiresAt = null,
  initialMilestones = [],
}: EditCardFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [reward, setReward] = useState(initialReward)
  const [color, setColor] = useState(initialColor)
  const [stampsRequired, setStampsRequired] = useState(initialStampsRequired)
  const [iconName, setIconName] = useState<string | null>(initialIcon)
  const [stampIconName, setStampIconName] = useState<string | null>(initialStampIcon)
  const [description, setDescription] = useState(initialDescription ?? "")
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt ?? "")
  const [previewMode, setPreviewMode] = useState<"normal" | "sellada">("normal")
  const [milestones, setMilestones] = useState<MilestoneEdit[]>(
    initialMilestones.map((m) => ({ ...m })),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const limpiarError = (campo: string) => setErrors((prev) => ({ ...prev, [campo]: "" }))

  const cambiarSorpresa = (i: number, cambios: Partial<MilestoneEdit>) => {
    setMilestones((prev) => prev.map((s, j) => (j === i ? { ...s, ...cambios } : s)))
    limpiarError(`sorpresa-${i}`)
  }

  const añadirSorpresa = () => {
    setMilestones((prev) => {
      const ocupados = new Set(prev.map((s) => s.stampNumber))
      const libre = Array.from({ length: stampsRequired }, (_, i) => i + 1).find(
        (n) => !ocupados.has(n),
      )
      return [...prev, { stampNumber: libre ?? 1, label: "", iconName: null, probability: 100 }]
    })
  }

  async function handleSave() {
    // La misma validación que la creación, para que las dos pantallas exijan lo
    // mismo y expliquen igual.
    const { errores, primerCampo } = validarBorrador({
      nombre: name,
      recompensa: reward,
      sellosRequeridos: stampsRequired,
      sorpresas: milestones,
    })
    setErrors(errores)
    if (primerCampo) {
      document.getElementById(`edit-${primerCampo}`)?.focus()
      return
    }

    setSaving(true)

    const response = await fetch(`/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        reward: reward.trim(),
        stampsRequired,
        brandColor: color,
        iconName,
        stampIconName,
        description: description.trim() || null,
        expiresAt: expiresAt || null,
        // Una sorpresa sin etiqueta es una fila que nadie llenó.
        milestoneRewards: sorpresasQueViajan(milestones),
      }),
    })

    setSaving(false)

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      toast.error(body?.error || "No fue posible guardar los cambios")
      return
    }

    router.push(`/dashboard/cards/${cardId}`)
    router.refresh()
  }

  const resumenDeDefectos = [
    expiresAt ? "Con vencimiento" : "Sin vencimiento",
    description.trim() ? "Con descripción" : "Sin descripción",
    milestones.length > 0
      ? `${milestones.length} sorpresa${milestones.length !== 1 ? "s" : ""}`
      : "Sin sorpresas",
  ].join(" · ")

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" className="-ml-2 min-h-11 w-fit gap-2 text-muted-foreground">
          <Link href={`/dashboard/cards/${cardId}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a la tarjeta
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Editar tarjeta</h1>
          <p className="text-muted-foreground">
            Las mismas tres decisiones. El resto sigue donde lo dejaste.
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="edit-recompensa">¿Qué se lleva el cliente?</Label>
              <Input
                id="edit-recompensa"
                name="edit-reward"
                value={reward}
                onChange={(e) => { setReward(e.target.value); limpiarError("recompensa") }}
                placeholder="Ej.: un café gratis"
                aria-invalid={!!errors.recompensa}
              />
              {errors.recompensa && (
                <p role="alert" className="text-sm text-destructive">{errors.recompensa}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sellosRequeridos">¿Cuántos sellos hacen falta?</Label>
              <div className="grid grid-cols-5 gap-2 sm:flex sm:items-center sm:gap-3">
                {SELLOS_SUGERIDOS.map((num, i) => (
                  <button
                    key={num}
                    id={i === 0 ? "edit-sellosRequeridos" : undefined}
                    type="button"
                    aria-pressed={stampsRequired === num}
                    onClick={() => setStampsRequired(num)}
                    className={cn(
                      "min-h-11 rounded-xl font-semibold transition-[background-color,color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-12",
                      stampsRequired === num
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80",
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* La tarjeta pudo publicarse con un número que no está entre los
                  sugeridos, así que se puede escribir. */}
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-stamps-otro" className="text-xs text-muted-foreground">
                  Otro:
                </Label>
                <Input
                  id="edit-stamps-otro"
                  name="edit-stamps-required"
                  type="number"
                  min={1}
                  max={100}
                  value={stampsRequired}
                  onChange={(e) =>
                    setStampsRequired(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-24"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nombre">¿Cómo se llama la tarjeta?</Label>
              <Input
                id="edit-nombre"
                name="edit-name"
                value={name}
                onChange={(e) => { setName(e.target.value); limpiarError("nombre") }}
                placeholder="Nombre de la tarjeta"
                aria-invalid={!!errors.nombre}
              />
              {errors.nombre && (
                <p role="alert" className="text-sm text-destructive">{errors.nombre}</p>
              )}
            </div>
          </section>

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
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  name="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ayuda a tus clientes a identificar esta tarjeta"
                  className="resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Vencimiento</Label>
                <ExpirationPicker value={expiresAt} onChange={setExpiresAt} />
              </div>

              <div className="space-y-3">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorPresets.map((presetColor) => (
                    <button
                      key={presetColor}
                      type="button"
                      onClick={() => setColor(presetColor)}
                      aria-label={`Usar color ${presetColor}`}
                      aria-pressed={color === presetColor}
                      className={cn(
                        "h-10 w-10 rounded-xl transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        color === presetColor ? "scale-110 ring-2 ring-foreground ring-offset-2" : "hover:scale-105",
                      )}
                      style={{ backgroundColor: presetColor }}
                    />
                  ))}
                  <input
                    type="color"
                    name="edit-color"
                    aria-label="Color personalizado"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-xl border border-border"
                  />
                  <Input
                    name="edit-color-text"
                    aria-label="Color en hexadecimal"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <Label>Ícono de la tarjeta</Label>
                  <IconPicker value={iconName} onChange={setIconName} businessLogoUrl={businessLogo} />
                </div>
                <div className="space-y-3">
                  <Label>Ícono del sello</Label>
                  <IconPicker value={stampIconName} onChange={setStampIconName} businessLogoUrl={businessLogo} />
                </div>
              </div>

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
                  <div key={m.id ?? `nueva-${i}`} className="space-y-3 rounded-xl border border-border p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-sorpresa-${i}`} className="text-xs">En el sello</Label>
                        <select
                          id={`edit-sorpresa-${i}`}
                          value={m.stampNumber}
                          onChange={(e) => cambiarSorpresa(i, { stampNumber: Number(e.target.value) })}
                          aria-invalid={!!errors[`sorpresa-${i}`]}
                          className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {Array.from({ length: stampsRequired }, (_, k) => k + 1).map((n) => (
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
                      <Label htmlFor={`edit-sorpresa-${i}-label`} className="text-xs">Recompensa</Label>
                      <Input
                        id={`edit-sorpresa-${i}-label`}
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
                      <Label htmlFor={`edit-sorpresa-${i}-prob`} className="text-xs">Probabilidad</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id={`edit-sorpresa-${i}-prob`}
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
                  disabled={milestones.length >= stampsRequired}
                  className="min-h-11 w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir sorpresa
                </Button>
              </div>
            </div>
          </details>
        </div>

        <div className="h-fit xl:sticky xl:top-24">
          <div className="rounded-2xl border border-border bg-muted/30 p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Así queda</h2>
              <div className="flex w-full overflow-hidden rounded-lg border border-border text-xs sm:w-auto">
                {(["normal", "sellada"] as const).map((modo) => (
                  <button
                    key={modo}
                    type="button"
                    aria-pressed={previewMode === modo}
                    onClick={() => setPreviewMode(modo)}
                    className={cn(
                      "min-h-10 flex-1 px-3 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none",
                      previewMode === modo
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {modo === "normal" ? "A medias" : "Completa"}
                  </button>
                ))}
              </div>
            </div>

            <LoyaltyCardPreview
              businessName={businessName}
              businessLogo={businessLogo ?? undefined}
              iconName={iconName}
              stampIconName={stampIconName}
              customerName="Cliente Feliz"
              currentStamps={previewMode === "sellada" ? stampsRequired : Math.floor(stampsRequired * 0.6)}
              maxStamps={stampsRequired}
              reward={reward || "Tu recompensa"}
              expirationDate={
                expiresAt ? new Date(expiresAt + "T12:00:00").toLocaleDateString("es-MX") : undefined
              }
              brandColor={color}
            />

            <Button type="button" onClick={handleSave} disabled={saving} className="mt-6 min-h-11 w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
