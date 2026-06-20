"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { MoreHorizontal, Stamp, Archive, Gift, Loader2, Check } from "lucide-react"

interface CustomerActionsMenuProps {
  customerId: string
  customerName: string
  currentStamps: number
  maxStamps: number
  reward: string
  hideStampAction?: boolean
}

type StampState = "idle" | "loading" | "stamped" | "redeemed" | "error"

export function CustomerActionsMenu({
  customerId,
  customerName,
  currentStamps,
  maxStamps,
  reward,
  hideStampAction = false,
}: CustomerActionsMenuProps) {
  const router = useRouter()
  const [stampState, setStampState] = useState<StampState>("idle")
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const handleArchive = async () => {
    setArchiving(true)
    await fetch(`/api/customers/${customerId}`, { method: "DELETE" })
    setArchiving(false)
    setArchiveOpen(false)
    router.refresh()
  }

  const handleStamp = useCallback(async () => {
    setStampState("loading")
    try {
      const type = currentStamps >= maxStamps ? "redeem" : "stamp"
      const res = await fetch("/api/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setStampState(data.event === "redeem" ? "redeemed" : "stamped")
      router.refresh()
      setTimeout(() => setStampState("idle"), 2000)
    } catch {
      setStampState("error")
      setTimeout(() => setStampState("idle"), 3000)
    }
  }, [customerId, currentStamps, maxStamps, router])

  const isReady = currentStamps >= maxStamps

  // Don't render stamp action when disabled (e.g., in /dashboard/customers)
  if (hideStampAction) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground data-[state=open]:bg-muted">
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground data-[state=open]:bg-muted"
          >
            {stampState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : stampState === "stamped" ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : stampState === "redeemed" ? (
              <Gift className="h-4 w-4 text-green-600" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={handleStamp}
            disabled={stampState === "loading"}
            className="gap-2 cursor-pointer"
          >
            {isReady ? (
              <Gift className="h-4 w-4 text-green-600" />
            ) : (
              <Stamp className="h-4 w-4" />
            )}
            {isReady ? "Canjear" : "Sellar"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

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
