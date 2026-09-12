"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Archive, Loader2 } from "lucide-react"

interface CustomerActionsMenuProps {
  customerId: string
  customerName: string
}

/**
 * Acciones secundarias del cliente. Sellar y canjear salieron de aquí a la
 * propia fila: son la acción de todos los días y no deben costar dos toques.
 */
export function CustomerActionsMenu({ customerId, customerName }: CustomerActionsMenuProps) {
  const router = useRouter()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const handleArchive = async () => {
    setArchiving(true)
    await fetch(`/api/customers/${customerId}`, { method: "DELETE" })
    setArchiving(false)
    setArchiveOpen(false)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Más acciones para ${customerName}`}
            className="h-10 w-10 text-muted-foreground data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => setArchiveOpen(true)}
            className="gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
          >
            <Archive className="h-4 w-4" />
            Archivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{customerName}</strong> será archivado. Sus datos se conservarán pero ya no aparecerá en las listas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="gap-2"
            >
              {archiving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Archive className="h-4 w-4" />
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
