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
import { getCardIcon } from "@/lib/card-icons"

interface MilestoneClaim {
  id: string
  label: string
  iconName: string | null
}

interface CustomerActionsMenuProps {
  customerId: string
  customerName: string
  currentStamps: number
  maxStamps: number
  reward: string
  brandColor?: string
}

type StampState = "idle" | "loading" | "stamped" | "redeemed" | "error"

export function CustomerActionsMenu({
  customerId,
  customerName,
  currentStamps,
  maxStamps,
  reward,
  brandColor = "#f97316",
}: CustomerActionsMenuProps) {
  const router = useRouter()
  const [stampState, setStampState] = useState<StampState>("idle")
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [milestoneClaim, setMilestoneClaim] = useState<MilestoneClaim | null>(null)

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
      if (data.milestoneClaim) {
        setMilestoneClaim(data.milestoneClaim)
      }
      router.refresh()
      setTimeout(() => setStampState("idle"), 2000)
    } catch {
      setStampState("error")
      setTimeout(() => setStampState("idle"), 3000)
    }
  }, [customerId, currentStamps, maxStamps, router])

  const isReady = currentStamps >= maxStamps

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

      {milestoneClaim && (() => {
        const milestoneIcon = getCardIcon(milestoneClaim.iconName)
        const MilestoneIconComp = milestoneIcon?.Icon
        return (
          <AlertDialog open={true} onOpenChange={(o) => { if (!o) setMilestoneClaim(null) }}>
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: brandColor }}>
                  {MilestoneIconComp ? <MilestoneIconComp className="h-7 w-7 text-white" /> : <Gift className="h-7 w-7 text-white" />}
                </div>
                <AlertDialogTitle className="text-center text-xl">¡Bono Sorpresa!</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-base">
                  <strong className="text-foreground">{customerName}</strong> obtuvo <strong className="text-foreground">{milestoneClaim.label}</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400 text-center">
                Notifica al cliente sobre su recompensa
              </div>
              <AlertDialogFooter className="sm:justify-center gap-2">
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  Canjear recompensa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}
    </>
  )
}
