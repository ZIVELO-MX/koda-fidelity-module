"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Archive, Loader2, Pencil, QrCode, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
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

interface CardActionsProps {
  cardId: string
  cardName: string
}

export function CardActions({ cardId, cardName }: CardActionsProps) {
  const router = useRouter()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleArchive() {
    setArchiving(true)
    const response = await fetch(`/api/cards/${cardId}`, { method: "DELETE" })

    if (!response.ok) {
      toast.error("No fue posible archivar la tarjeta")
      setArchiving(false)
      return
    }

    router.push("/dashboard/cards")
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const response = await fetch(`/api/cards/${cardId}?permanent=true`, { method: "DELETE" })

    if (!response.ok) {
      toast.error("No fue posible eliminar la tarjeta")
      setDeleting(false)
      return
    }

    router.push("/dashboard/cards")
    router.refresh()
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href={`/dashboard/cards/${cardId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href={`/dashboard/qr-codes/${cardId}`}>
            <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
            Código QR
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setArchiveOpen(true)} disabled={archiving} className="w-full sm:w-auto">
          {archiving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Archivar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(true)} disabled={deleting} className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto">
          {deleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Eliminar
        </Button>
      </div>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar tarjeta?</AlertDialogTitle>
            <AlertDialogDescription>
              La tarjeta <strong>{cardName}</strong> será archivada y dejará de aparecer en el dashboard. Los datos de los clientes se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiving} className="gap-2">
              {archiving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <Archive className="h-4 w-4" aria-hidden="true" />
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarjeta permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción <strong>no se puede deshacer</strong>. La tarjeta <strong>{cardName}</strong> y todos los datos de sus clientes serán eliminados para siempre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="gap-2 bg-destructive hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
