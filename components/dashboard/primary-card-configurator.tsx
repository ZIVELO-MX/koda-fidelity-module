"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { CardStatus, SubscriptionPlan } from "@prisma/client"

type PrimaryCardOption = {
  id: string
  name: string
  reward: string
  status: CardStatus
}

export function PrimaryCardConfigurator({
  cards,
  primaryCardId,
  plan,
}: {
  cards: PrimaryCardOption[]
  primaryCardId: string | null
  plan: SubscriptionPlan
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState(primaryCardId ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelectedCardId(primaryCardId ?? "")
      setError(null)
    }
    setOpen(nextOpen)
  }

  async function savePrimaryCard() {
    if (!selectedCardId || saving) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/cards/${selectedCardId}/primary`, { method: "POST" })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        setError(body?.error ?? "No fue posible configurar la tarjeta principal.")
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError("No fue posible conectar con el servidor. Inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Configurar tarjeta principal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar tarjeta principal</DialogTitle>
          <DialogDescription>
            {plan === "LITE"
              ? "Lite permite una tarjeta activa. La que elijas se activará y las demás seguirán guardadas con bloqueo por plan."
              : "Esta preferencia se conservará si la cuenta cambia a Lite. En Pro, tus tarjetas publicadas siguen activas."}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selectedCardId} onValueChange={setSelectedCardId} className="gap-2">
          {cards.map((card) => (
            <label
              key={card.id}
              htmlFor={`primary-card-${card.id}`}
              className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem id={`primary-card-${card.id}`} value={card.id} className="mt-1" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <span className="truncate">{card.name}</span>
                  {card.id === primaryCardId && <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Principal actual" />}
                </span>
                <span className="block truncate text-sm text-muted-foreground">{card.reward}</span>
                {card.status === "LOCKED_BY_PLAN" && (
                  <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">Bloqueada por el plan; puedes elegirla para activarla</span>
                )}
              </span>
            </label>
          ))}
        </RadioGroup>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            onClick={savePrimaryCard}
            disabled={!selectedCardId || selectedCardId === primaryCardId || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Guardar tarjeta principal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
