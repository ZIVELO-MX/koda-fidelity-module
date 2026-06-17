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
import { Archive, QrCode, Pencil, Loader2, Check, Trash2 } from "lucide-react"
import Link from "next/link"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"

const colorPresets = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b",
]

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
}: CardActionsProps) {
  const router = useRouter()

  // archive state
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  // permanent delete state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // edit state
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [reward, setReward] = useState(initialReward)
  const [color, setColor] = useState(initialColor)
  const [iconName, setIconName] = useState<string | null>(initialIcon)
  const [stampIconName, setStampIconName] = useState<string | null>(initialStampIcon)
  const [previewMode, setPreviewMode] = useState<"normal" | "sellada">("normal")
  const [description, setDescription] = useState(initialDescription ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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
    setEditError(null)
    setSaved(false)
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { setEditError("El nombre es obligatorio"); return }
    if (!reward.trim()) { setEditError("La recompensa es obligatoria"); return }

    setSaving(true)
    setEditError(null)

    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), reward: reward.trim(), brandColor: color, iconName, stampIconName, description: description.trim() || null }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => {
        setEditOpen(false)
        router.refresh()
      }, 800)
    } else {
      setEditError("No fue posible guardar los cambios")
    }
    setSaving(false)
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Tarjeta</DialogTitle>
          </DialogHeader>

          <div className="grid sm:grid-cols-2 gap-6 py-2">
            {/* Live preview */}
            <div className="sm:order-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vista previa</p>
                <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("normal")}
                    className={`px-2.5 py-1 transition-colors ${previewMode === "normal" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("sellada")}
                    className={`px-2.5 py-1 transition-colors ${previewMode === "sellada" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
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

          <div className="sm:order-1 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la tarjeta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-reward">Recompensa</Label>
              <Input
                id="edit-reward"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="Ej: Café gratis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">
                Descripción <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ayuda a tus clientes a identificar esta tarjeta"
                className="resize-none"
                rows={2}
                maxLength={200}
              />
            </div>

            <div className="space-y-3">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-lg transition-all ${
                      color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-border"
                />
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

            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          </div>

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
    </>
  )
}
