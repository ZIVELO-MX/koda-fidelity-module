"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Gift, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { ExpirationPicker } from "@/components/dashboard/expiration-picker"
import { toast } from "sonner"
import { getRarityColor, getRarityDescription, getRarityLabel, getRarityRange } from "@/lib/card-utils"
import { cn } from "@/lib/utils"

const colorPresets = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
]

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
  const [milestonesOpen, setMilestonesOpen] = useState(true)
  const [milestones, setMilestones] = useState<MilestoneEdit[]>(
    initialMilestones.map((milestone) => ({
      id: milestone.id,
      stampNumber: milestone.stampNumber,
      label: milestone.label,
      iconName: milestone.iconName,
      probability: milestone.probability,
    })),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    if (!reward.trim()) {
      toast.error("La recompensa es obligatoria")
      return
    }

    setSaving(true)
    setSaved(false)

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
        milestoneRewards: milestones.map((milestone) => ({
          id: milestone.id,
          stampNumber: milestone.stampNumber,
          label: milestone.label,
          iconName: milestone.iconName,
          probability: milestone.probability,
        })),
      }),
    })

    setSaving(false)

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      toast.error(body?.error || "No fue posible guardar los cambios")
      return
    }

    setSaved(true)
    router.push(`/dashboard/cards/${cardId}`)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit gap-2 text-muted-foreground">
          <Link href={`/dashboard/cards/${cardId}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a la tarjeta
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Editar Tarjeta</h1>
          <p className="text-muted-foreground">Ajusta contenido, diseño y recompensas sorpresa en una vista amplia.</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input id="edit-name" name="edit-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la tarjeta…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reward">Recompensa</Label>
              <Input id="edit-reward" name="edit-reward" value={reward} onChange={(event) => setReward(event.target.value)} placeholder="Ej.: Café gratis" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">
              Descripción <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="edit-description"
              name="edit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ayuda a tus clientes a identificar esta tarjeta…"
              className="resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-stamps-required">Sellos requeridos</Label>
              <Input
                id="edit-stamps-required"
                name="edit-stamps-required"
                type="number"
                min={1}
                max={100}
                value={stampsRequired}
                onChange={(event) => setStampsRequired(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                className="max-w-28"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Fecha de vencimiento <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <ExpirationPicker value={expiresAt} onChange={setExpiresAt} />
            </div>
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
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-10 cursor-pointer rounded-xl border border-border"
              />
              <Input
                name="edit-color-text"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="w-28 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Label>Ícono de tarjeta <span className="text-xs font-normal text-muted-foreground">(opcional)</span></Label>
              <IconPicker value={iconName} onChange={setIconName} businessLogoUrl={businessLogo} />
            </div>
            <div className="space-y-3">
              <Label>Ícono del sello <span className="text-xs font-normal text-muted-foreground">(opcional — por defecto igual al de tarjeta)</span></Label>
              <IconPicker value={stampIconName} onChange={setStampIconName} businessLogoUrl={businessLogo} />
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <Collapsible open={milestonesOpen} onOpenChange={setMilestonesOpen}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-foreground">
                    <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
                    Recompensas sorpresa
                  </h2>
                  <p className="text-sm text-muted-foreground">Bonos configurables por posición del sello.</p>
                </div>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" aria-label={milestonesOpen ? "Ocultar recompensas sorpresa" : "Mostrar recompensas sorpresa"}>
                    {milestonesOpen ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="space-y-2">
                {Array.from({ length: stampsRequired }, (_, i) => i + 1).map((pos) => {
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
                                  onChange={(event) =>
                                    setMilestones((prev) =>
                                      prev.map((x, j) => (j === mi ? { ...x, label: event.target.value } : x)),
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
                                    onChange={(event) =>
                                      setMilestones((prev) =>
                                        prev.map((x, j) =>
                                          j === mi ? { ...x, probability: Number(event.target.value) } : x,
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
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline">
              <Link href={`/dashboard/cards/${cardId}`}>Cancelar</Link>
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : saved ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
              {saving ? "Guardando…" : saved ? "Guardado" : "Guardar cambios"}
            </Button>
          </div>
        </section>

        <aside className="h-fit space-y-4 xl:sticky xl:top-24">
          <section className="rounded-2xl border border-border bg-muted/30 p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
              <h2 className="text-sm font-medium text-muted-foreground">Vista previa</h2>
              <div className="flex overflow-hidden rounded-lg border border-border text-xs">
                <button
                  type="button"
                  aria-pressed={previewMode === "normal"}
                  onClick={() => setPreviewMode("normal")}
                  className={cn(
                    "flex-1 px-3 py-1.5 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    previewMode === "normal" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  Normal
                </button>
                <button
                  type="button"
                  aria-pressed={previewMode === "sellada"}
                  onClick={() => setPreviewMode("sellada")}
                  className={cn(
                    "flex-1 px-3 py-1.5 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    previewMode === "sellada" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  Sellada
                </button>
              </div>
            </div>
            <LoyaltyCardPreview
              businessName={businessName}
              businessLogo={businessLogo ?? undefined}
              iconName={iconName}
              stampIconName={stampIconName}
              brandColor={color}
              reward={reward || "Tu recompensa"}
              currentStamps={previewMode === "sellada" ? stampsRequired : Math.ceil(stampsRequired / 2)}
              maxStamps={stampsRequired}
              expirationDate={expiresAt ? new Date(`${expiresAt}T12:00:00`).toLocaleDateString("es-MX") : undefined}
              showQR={false}
              className="text-sm"
            />
          </section>
        </aside>
      </div>
    </div>
  )
}
