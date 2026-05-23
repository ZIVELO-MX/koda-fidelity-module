"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { Check, Smartphone } from "lucide-react"

// Mock data - in a real app this would come from a database
const cardData = {
  "coffee-rewards": {
    businessName: "The Daily Grind",
    cardName: "Coffee Rewards",
    reward: "Free Coffee",
    maxStamps: 10,
    expirationDate: "Dec 31, 2026",
    brandColor: "#f97316",
  },
  "lunch-special": {
    businessName: "Bistro 42",
    cardName: "Lunch Special",
    reward: "Free Dessert",
    maxStamps: 8,
    expirationDate: "Dec 31, 2026",
    brandColor: "#3b82f6",
  },
}

export default function JoinCardPage() {
  const params = useParams()
  const cardId = params.cardId as string
  const card = cardData[cardId as keyof typeof cardData] || cardData["coffee-rewards"]

  const [step, setStep] = useState<"name" | "wallet">("name")
  const [customerName, setCustomerName] = useState("")
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault()
    if (customerName.trim()) {
      setStep("wallet")
    }
  }

  const handleAddToGoogleWallet = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/passes/google/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || data.error || "Error al generar el pase")
      }

      if (data.saveUrl) {
        window.open(data.saveUrl, "_blank")
      }

      setAdded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el pase")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: card.brandColor }}
            >
              {card.businessName.charAt(0)}
            </div>
            <span className="font-semibold text-foreground">{card.businessName}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {!added ? (
            <>
              {step === "name" ? (
                <div className="space-y-8">
                  {/* Card Preview */}
                  <div className="scale-90 origin-top">
                    <LoyaltyCardPreview
                      businessName={card.businessName}
                      customerName={customerName || "Your Name"}
                      currentStamps={0}
                      maxStamps={card.maxStamps}
                      reward={card.reward}
                      expirationDate={card.expirationDate}
                      brandColor={card.brandColor}
                      showQR={false}
                    />
                  </div>

                  {/* Form */}
                  <div className="bg-card rounded-2xl p-6 border border-border">
                    <h1 className="text-xl font-bold text-foreground text-center mb-2">
                      Join {card.cardName}
                    </h1>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      Collect {card.maxStamps} stamps and get {card.reward.toLowerCase()}!
                    </p>

                    <form onSubmit={handleSubmitName} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Tu Nombre</Label>
                        <Input
                          id="name"
                          placeholder="Ingresa tu nombre"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          autoFocus
                          className="text-base"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={!customerName.trim()}
                      >
                        Continuar
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Card Preview */}
                  <div className="scale-90 origin-top">
                    <LoyaltyCardPreview
                      businessName={card.businessName}
                      customerName={customerName}
                      currentStamps={0}
                      maxStamps={card.maxStamps}
                      reward={card.reward}
                      expirationDate={card.expirationDate}
                      brandColor={card.brandColor}
                      showQR={false}
                    />
                  </div>

                  {/* Wallet Options */}
                  <div className="bg-card rounded-2xl p-6 border border-border">
                    <h1 className="text-xl font-bold text-foreground text-center mb-2">
                      Guardar en tu Wallet
                    </h1>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      Agrega esta tarjeta al wallet de tu teléfono para acceso rápido
                    </p>

                    <div className="space-y-3">
                      <div className="relative">
                        <Button
                          disabled
                          className="w-full h-14 bg-muted text-muted-foreground cursor-not-allowed"
                          size="lg"
                        >
                          <svg className="h-6 w-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                          </svg>
                          Apple Wallet — Próximamente
                        </Button>
                        <p className="text-xs text-muted-foreground text-center mt-1.5">
                          Requiere Apple Developer Account
                        </p>
                      </div>

                      <Button
                        onClick={handleAddToGoogleWallet}
                        variant="outline"
                        className="w-full h-14"
                        size="lg"
                        disabled={loading}
                      >
                        <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        {loading ? "Generando..." : "Añadir a Google Wallet"}
                      </Button>
                      {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                      )}
                    </div>

                    <button
                      onClick={() => setStep("name")}
                      className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Volver
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Success State */
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  ¡Tarjeta Agregada!
                </h1>
                <p className="text-muted-foreground">
                  Tu tarjeta de lealtad ha sido guardada en tu wallet
                </p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Open your wallet app to view your card
                  </p>
                </div>
                <LoyaltyCardPreview
                  businessName={card.businessName}
                  customerName={customerName}
                  currentStamps={0}
                  maxStamps={card.maxStamps}
                  reward={card.reward}
                  expirationDate={card.expirationDate}
                  brandColor={card.brandColor}
                  showQR={true}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Muestra este código QR cuando visites para ganar sellos
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          Powered by Koda Fidelity
        </p>
      </footer>
    </div>
  )
}
