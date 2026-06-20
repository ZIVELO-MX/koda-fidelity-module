"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Archive, QrCode, Pencil, Loader2, Check, Trash2, Plus, X, Gift, Crown } from "lucide-react"
import Link from "next/link"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { getRarityColor, getRarityLabel, getRarityDescription } from "@/lib/card-utils"
import { cn } from "@/lib/utils"

const colorPresets = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b",
]

interface MilestoneEdit {
  id?: string
  stampNumber: number
  label: string
  iconName: string | null
  probability: number
}

interface CardActionsProps {
  cardId: string
  businessName: string
  businessLogo?: string | null
  maxStamps: number
  initialName?: string
  initialReward?: string
  initialColor?: string
  initialIcon?: string | null
  initialStampIcon?: string | null
  initialDescription?: string | null
  initialMilestones?: {
    id: string
    stampNumber: number
    label: string
    iconName: string | null
    probability: number
  }[]
}

export function CardActions({
  cardId,
  businessName,
  businessLogo,
  maxStamps,
  initialName = "",
  initialReward = "",
  initialColor = "#f97316",
  initialIcon = null,
  initialStampIcon = null,
  initialDescription = null,
  initialMilestones = [],
}: CardActionsProps) {
  const router = useRouter()

  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [reward, setReward] = useState(initialReward)
  const [color, setColor] = useState(initialColor)
  const [iconName, setIconName] = useState<string | null>(initialIcon)
  const [stampIconName, setStampIconName] = useState<string | null>(initialStampIcon)
  const [previewMode, setPreviewMode] = useState<"normal" | "sellada">("normal")
  const [description, setDescription] = useState(initialDescription ?? "")
  const [milestones, setMilestones] = useState<MilestoneEdit[]>(
    initialMilestones.map(m => ({ id: m.id, stampNumber: m.stampNumber, label: m.label, iconName: m.iconName, probability: m.probability })),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleArchive = async () => {
    setArchiving(true)
    setArchiveError(null)
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard/cards")
    } else {
      setArchiveError("No fue posible archivar la tarjeta")
      setArchiving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/cards/${cardId}?permanent=true`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard/cards")
    } else {
      setDeleteError("No fue posible eliminar la tarjeta")
      setDeleting(false)
    }
  }

  const openEdit = () => {
    setName(initialName)
    setReward(initialReward)
    setColor(initialColor)
    setIconName(initialIcon)
    setStampIconName(initialStampIcon)
    setPreviewMode("normal")
    setDescription(initialDescription ?? "")
    setMilestones(initialMilestones.map(m => ({ id: m.id, stampNumber: m.stampNumber, label: m.label, iconName: m.iconName, probability: m.probability })))
    setEditError(null)
    setSaved(false)
    setEditOpen(true)
  }

  const availablePositions = Array.from({ length: maxStamps }, (_, i) => i + 1)
    .filter(pos => !milestones.some(m => m.stampNumber === pos))

  const addMilestone = (pos: number) => {
    setMilestones([...milestones, { stampNumber: pos, label: "", iconName: null, probability: 100 }])
  }

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index))
  }

  const updateMilestone = (index: number, field: keyof MilestoneEdit, value: unknown) => {
    setMilestones(milestones.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const handleSave = async () => {
    if (!name.trim()) { setEditError("El nombre es obligatorio"); return }
    if (!reward.trim()) { setEditError("La recompensa es obligatoria"); return }

    setSaving(true)
    setEditError(null)

    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        reward: reward.trim(),
        brandColor: color,
        iconName,
        stampIconName,
        description: description.trim() || null,
        milestoneRewards: milestones.map(m => ({
          id: m.id,
          stampNumber: m.stampNumber,
          label: m.label,
          iconName: m.iconName,
          probability: m.probability,
        })),
      }),
    })

    setSaving(false)

    if (res.ok) {
      setSaved(true)
      setTimeout(() => {
        setEditOpen(false)
        router.refresh()
      }, 800)
    } else {
      const err = await res.json().catch(() => null)
      setEditError(err?.error || "No fue posible guardar los cambios")
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Link href={`/dashboard/qr-codes/${cardId}`}>
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            Código QR
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)} disabled={archiving}>
          {archiving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Archive className="h-4 w-4 mr-2" />
          )}
          Archivar
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} disabled={deleting} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
          {deleting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Eliminar
        </Button>
      </div>
      {archiveError && <p className="text-sm text-destructive mt-2">{archiveError}</p>}
      {deleteError && <p className="text-sm text-destructive mt-2">{deleteError}</p>}

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Tarjeta</DialogTitle>
          </DialogHeader>

          <div className="grid lg:grid-cols-2 gap-8 py-2">
            {/* Preview */}
            <div className="lg:order-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vista previa</p>
                <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("normal")}
                    className={cn(
                      "px-2.5 py-1 transition-colors",
                      previewMode === "normal"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("sellada")}
                    className={cn(
                      "px-2.5 py-1 transition-colors",
                      previewMode === "sellada"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground",
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
                currentStamps={previewMode === "sellada" ? maxStamps : Math.ceil(maxStamps / 2)}
                maxStamps={maxStamps}
                showQR={false}
                className="text-sm"
              />
            </div>

            {/* Form fields */}
            <div className="lg:order-1 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la tarjeta" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-reward">Recompensa</Label>
                <Input id="edit-reward" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Ej: Café gratis" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  Descripción <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                </Label>
                <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ayuda a tus clientes a identificar esta tarjeta" className="resize-none" rows={2} maxLength={200} />
              </div>

              <div className="space-y-3">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "w-9 h-9 rounded-lg transition-all",
                        color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border border-border" />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Ícono de tarjeta <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                <IconPicker value={iconName} onChange={setIconName} businessLogoUrl={businessLogo} />
              </div>

              <div className="space-y-3">
                <Label>Ícono del sello <span className="text-muted-foreground font-normal text-xs">(opcional — por defecto igual al de tarjeta)</span></Label>
                <IconPicker value={stampIconName} onChange={setStampIconName} businessLogoUrl={businessLogo} />
              </div>
            </div>
          </div>

          {/* ── Milestone Path ── */}
          {milestones.length > 0 && (
            <div className="border-t border-border pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                Recompensas en el Camino
              </h4>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {Array.from({ length: maxStamps }, (_, i) => {
                  const pos = i + 1
                  const ms = milestones.find(m => m.stampNumber === pos)
                  const isLast = pos === maxStamps
                  return (
                    <div key={pos} className="flex items-center gap-1">
                      <div className="flex flex-col items-center gap-1 min-w-[48px]">
                        <span className="text-[10px] text-muted-foreground font-medium">#{pos}</span>
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                            ms
                              ? "border-primary bg-primary/10 text-primary"
                              : isLast
                                ? "border-amber-400 bg-amber-400/10 text-amber-500"
                                : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {ms ? (
                            <Gift className="h-4 w-4" />
                          ) : isLast ? (
                            <Crown className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-bold">{pos}</span>
                          )}
                        </div>
                        {ms && (
                          <div className="group relative">
                            <span className="text-[9px] text-primary font-medium truncate max-w-[48px] block cursor-default">
                              {ms.label}
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                              <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded-md shadow-md border border-border whitespace-nowrap">
                                {ms.label}
                              </div>
                            </div>
                          </div>
                        )}
                        {ms && (
                          <div className="flex items-center gap-0.5">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: getRarityColor(ms.probability) }}
                            />
                            <span className="text-[9px] text-muted-foreground">{ms.probability}%</span>
                          </div>
                        )}
                      </div>
                      {pos < maxStamps && (
                        <div className="w-3 h-px bg-border shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Milestone Editor ── */}
          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  Recompensas Sorpresa
                </h4>
                <p className="text-sm text-muted-foreground">
                  Bonos con probabilidad al alcanzar posiciones específicas
                </p>
              </div>
            </div>

            {milestones.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No hay recompensas configuradas.</p>
            )}

            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="flex flex-wrap items-end gap-3 p-4 bg-muted/30 dark:bg-muted/20 rounded-xl border border-border">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sello #</Label>
                    <Input
                      type="number"
                      min={1}
                      max={maxStamps}
                      value={m.stampNumber}
                      onChange={(e) => updateMilestone(i, "stampNumber", Math.min(maxStamps, Math.max(1, Number(e.target.value))))}
                      className="w-20"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px] space-y-1.5">
                    <Label className="text-xs">Recompensa</Label>
                    <Input
                      value={m.label}
                      onChange={(e) => updateMilestone(i, "label", e.target.value)}
                      placeholder="Ej: Café gratis"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ícono</Label>
                    <IconPicker value={m.iconName} onChange={(v) => updateMilestone(i, "iconName", v)} businessLogoUrl={businessLogo} />
                  </div>
                  <div className="space-y-1.5 min-w-[180px]">
                    <Label className="text-xs">Probabilidad</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={m.probability}
                        onChange={(e) => updateMilestone(i, "probability", Number(e.target.value))}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: getRarityColor(m.probability) }}
                      />
                      <span className="text-sm font-mono w-10 text-right">{m.probability}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: getRarityColor(m.probability) }}
                      />
                      <span className="font-medium">{getRarityLabel(m.probability)}</span>
                      <span className="text-muted-foreground">— {getRarityDescription(m.probability)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMilestone(i)} className="text-destructive hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {availablePositions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availablePositions.map(pos => (
                  <Button key={pos} variant="outline" size="sm" onClick={() => addMilestone(pos)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Sello #{pos}
                  </Button>
                ))}
              </div>
            )}

            {availablePositions.length === 0 && milestones.length > 0 && (
              <p className="text-xs text-muted-foreground">Todas las posiciones tienen recompensa.</p>
            )}
          </div>

          {editError && <p className="text-sm text-destructive">{editError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4 mr-2" />
              ) : null}
              {saved ? "¡Guardado!" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar tarjeta?</AlertDialogTitle>
            <AlertDialogDescription>
              La tarjeta <strong>{initialName}</strong> será archivada y dejará de aparecer en el dashboard. Los datos de los clientes se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiving} className="gap-2">
              {archiving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Archive className="h-4 w-4" />
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarjeta permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción <strong>no se puede deshacer</strong>. La tarjeta <strong>{initialName}</strong> y todos los datos de sus clientes serán eliminados para siempre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2 bg-destructive hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
