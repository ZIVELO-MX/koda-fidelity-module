"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface DeleteExpiredCardButtonProps {
  cardId: string
  cardName: string
  affectedCustomers: number
}

export function DeleteExpiredCardButton({ cardId, cardName, affectedCustomers }: DeleteExpiredCardButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" })
    if (res.ok) {
      router.refresh()
    } else {
      setError("No fue posible eliminar la tarjeta")
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Eliminar tarjeta vencida"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarjeta vencida</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar <strong>{cardName}</strong>? Esta acción archivará la tarjeta y no podrá recuperarse.
              {affectedCustomers > 0 && (
                <> Afectará a <strong>{affectedCustomers} cliente{affectedCustomers !== 1 ? "s" : ""}</strong> que no completaron sus sellos.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive px-1">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
