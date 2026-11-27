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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Archive, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

interface CustomerActionsMenuProps {
  customerId: string
  customerName: string
  customerEmail?: string | null
}

/**
 * Acciones secundarias del cliente. Sellar y canjear salieron de aquí a la
 * propia fila: son la acción de todos los días y no deben costar dos toques.
 */
export function CustomerActionsMenu({ customerId, customerName, customerEmail }: CustomerActionsMenuProps) {
  const router = useRouter()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)

  async function saveEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingEmail(true)
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        toast.error(error?.error ?? "No fue posible corregir el correo")
        return
      }
      setEmailOpen(false)
      router.refresh()
      toast.success("Correo corregido")
    } catch {
      toast.error("Error de red. El correo no se actualizó.")
    } finally {
      setSavingEmail(false)
    }
  }

  // Antes se ignoraba la respuesta: un rechazo cerraba el diálogo como si se
  // hubiera archivado, y un error de red lo dejaba girando.
  const handleArchive = async (event: React.MouseEvent) => {
    event.preventDefault()
    setArchiving(true)
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" })
      if (!res.ok) {
        const sobre = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(sobre?.error || "No fue posible archivar al cliente")
        return
      }
      setArchiveOpen(false)
      router.refresh()
    } catch {
      toast.error("Error de red. El cliente no se archivó.")
    } finally {
      setArchiving(false)
    }
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

        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => { setEmail(customerEmail ?? ""); setEmailOpen(true) }}>
            <Mail className="h-4 w-4" />
            Corregir correo
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setArchiveOpen(true)}
            className="gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
          >
            <Archive className="h-4 w-4" />
            Archivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={emailOpen} onOpenChange={open => { if (!savingEmail) setEmailOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir correo</DialogTitle>
            <DialogDescription>Actualiza el correo de {customerName}. Su progreso y su historial se conservan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEmail} className="space-y-4">
            <label className="block space-y-2">
              <span>Correo electrónico</span>
              <Input type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required disabled={savingEmail} />
            </label>
            <DialogFooter>
              <Button type="submit" disabled={savingEmail}>Guardar correo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
