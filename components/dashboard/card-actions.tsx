"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Archive, Loader2, MoreHorizontal, Pencil, QrCode, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
      {/* Compartir el código es la acción del día a día y se queda a la vista.
          Editar, archivar y eliminar pasan al menú: eran cuatro botones del
          mismo peso compitiendo entre ellos y con la propia tarjeta. */}
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="outline" className="min-h-11">
          <Link href={`/dashboard/qr-codes/${cardId}`}>
            <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
            Código QR
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Más acciones para ${cardName}`}
              className="min-h-11 min-w-11 text-muted-foreground data-[state=open]:bg-muted"
              disabled={archiving || deleting}
            >
              {archiving || deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild className="cursor-pointer gap-2">
              <Link href={`/dashboard/cards/${cardId}/edit`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setArchiveOpen(true)} className="cursor-pointer gap-2">
              <Archive className="h-4 w-4" aria-hidden="true" />
              Archivar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
