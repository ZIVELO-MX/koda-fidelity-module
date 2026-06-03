"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Trash2, QrCode, Pencil, Loader2, Check } from "lucide-react"
import Link from "next/link"
import { IconPicker } from "@/components/dashboard/icon-picker"

const colorPresets = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b",
]

interface CardActionsProps {
  cardId: string
  initialName?: string
  initialReward?: string
  initialColor?: string
  initialIcon?: string | null
}

export function CardActions({
  cardId,
  initialName = "",
  initialReward = "",
  initialColor = "#f97316",
  initialIcon = null,
}: CardActionsProps) {
  const router = useRouter()

  // delete state
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // edit state
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [reward, setReward] = useState(initialReward)
  const [color, setColor] = useState(initialColor)
  const [iconName, setIconName] = useState<string | null>(initialIcon)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta tarjeta? Los clientes perderán su progreso.")) return

    setDeleting(true)
    setDeleteError(null)

    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" })

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
      body: JSON.stringify({ name: name.trim(), reward: reward.trim(), brandColor: color, iconName }),
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
        <Link href="/dashboard/qr-codes">
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            Código QR
          </Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Eliminar
        </Button>
      </div>
      {deleteError && <p className="text-sm text-destructive mt-2">{deleteError}</p>}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Tarjeta</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
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
              <Label>Ícono <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
              <IconPicker value={iconName} onChange={setIconName} />
            </div>

            {editError && <p className="text-sm text-destructive">{editError}</p>}
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
