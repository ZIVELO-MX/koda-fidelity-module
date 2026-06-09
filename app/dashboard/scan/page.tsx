"use client"

import { useState, useEffect, Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QRScanner } from "@/components/scan/qr-scanner"
import {
  Camera,
  Stamp,
  Check,
  Gift,
  ArrowLeft,
  Search,
  User,
  X,
  Loader2,
  Scan,
  AlertTriangle,
} from "lucide-react"
import { daysUntilExpiry } from "@/lib/card-utils"

interface SearchCustomer {
  id: string
  name: string
  stamps: number
  maxStamps: number
  cardName: string
  cardReward: string
  cardBrandColor: string
  cardExpiresAt: string | null
}

type ScanState = "idle" | "scanning" | "found" | "stamped" | "redeemed"

function ScanPageInner() {
  const searchParams = useSearchParams()
  const cardIdFilter = searchParams.get("cardId")
  const [scanState, setScanState] = useState<ScanState>("idle")
  const [selectedCustomer, setSelectedCustomer] = useState<SearchCustomer | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchCustomer[]>([])
  const [searching, setSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [useCamera, setUseCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      queueMicrotask(() => setSearchResults([]))
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ q: searchQuery })
        if (cardIdFilter) params.set("cardId", cardIdFilter)
        const res = await fetch(`/api/customers?${params}`)
        const data = await res.json()
        setSearchResults(data.customers || [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, cardIdFilter])

  const handleScanResult = async (customerId: string) => {
    setScanState("scanning")
    setCameraError(null)
    setUseCamera(false)

    try {
      const res = await fetch(`/api/join?id=${encodeURIComponent(customerId)}`)
      if (!res.ok) throw new Error("Cliente no encontrado")
      const data = await res.json()
      const c = data.customer
      setSelectedCustomer({
        id: c.id,
        name: c.name,
        stamps: c.stamps,
        maxStamps: c.card.stampsRequired,
        cardName: c.card.name,
        cardReward: c.card.reward,
        cardBrandColor: c.card.brandColor,
        cardExpiresAt: c.card.expiresAt ?? null,
      })
      setScanState("found")
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al buscar cliente")
      setScanState("idle")
    }
  }

  const addStamp = async () => {
    if (!selectedCustomer) return
    setActionLoading(true)
    setActionError(null)

    try {
      const type = selectedCustomer.stamps >= selectedCustomer.maxStamps ? "redeem" : "stamp"
      const res = await fetch("/api/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selectedCustomer.id, type }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error("No fue posible procesar la operación")

      if (data.event === "redeem") {
        setSelectedCustomer({ ...selectedCustomer, stamps: 0 })
        setScanState("redeemed")
      } else {
        setSelectedCustomer({ ...selectedCustomer, stamps: selectedCustomer.stamps + 1 })
        setScanState("stamped")
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al procesar")
    } finally {
      setActionLoading(false)
    }
  }

  const resetScan = () => {
    setScanState("idle")
    setSelectedCustomer(null)
    setSearchQuery("")
    setSearchResults([])
    setActionError(null)
    setCameraError(null)
  }

  const selectCustomer = (customer: SearchCustomer) => {
    setSelectedCustomer(customer)
    setScanState("found")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Panel</span>
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/short-logo.svg"
              alt="Koda"
              width={32}
              height={32}
              className="size-8 shrink-0"
            />
            <span className="font-semibold text-foreground">Escáner de Sellos</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {scanState === "idle" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Button
                  onClick={() => setUseCamera(!useCamera)}
                  variant={useCamera ? "default" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  {useCamera ? (
                    <>
                      <Scan className="h-5 w-5 mr-2" />
                      Escáner Activo
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      Abrir Escáner
                    </>
                  )}
                </Button>

                {cameraError && (
                  <p className="text-sm text-red-500 text-center">{cameraError}</p>
                )}

                {useCamera && (
                  <QRScanner
                    onScan={handleScanResult}
                    onError={(err) => setCameraError(err)}
                  />
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">o buscar</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre de cliente..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {searching && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {searchResults.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.cardName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {customer.stamps}/{customer.maxStamps}
                            </p>
                            <p className="text-xs text-muted-foreground">sellos</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!searching && searchQuery && searchResults.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground text-center">
                    No se encontraron clientes
                  </p>
                )}
              </div>
            </div>
          )}

          {scanState === "scanning" && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {scanState === "found" && selectedCustomer && (
            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-foreground">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.cardName}</p>
                    </div>
                  </div>
                  <button
                    onClick={resetScan}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progreso</span>
                    <span className="text-sm font-medium text-foreground">
                      {selectedCustomer.stamps}/{selectedCustomer.maxStamps} sellos
                    </span>
                  </div>
                  <div className="grid grid-cols-10 gap-1.5">
                    {Array.from({ length: selectedCustomer.maxStamps }).map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-lg ${i < selectedCustomer.stamps ? "" : "bg-muted border border-border"}`}
                        style={i < selectedCustomer.stamps ? { backgroundColor: selectedCustomer.cardBrandColor } : undefined}
                      />
                    ))}
                  </div>
                </div>

                {selectedCustomer.stamps >= selectedCustomer.maxStamps ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <Gift className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">¡Recompensa Lista!</p>
                      <p className="text-sm text-green-600">El cliente puede canjear su recompensa</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: `${selectedCustomer.cardBrandColor}1a` }}>
                    <Stamp className="h-6 w-6" style={{ color: selectedCustomer.cardBrandColor }} />
                    <div>
                      <p className="font-medium text-foreground">
                        {selectedCustomer.maxStamps - selectedCustomer.stamps} más para la meta
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Agrega un sello por esta visita
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {actionError && (
                <p className="text-sm text-red-500 text-center">{actionError}</p>
              )}

              <Button
                onClick={addStamp}
                disabled={actionLoading}
                size="lg"
                className="w-full h-16 text-lg text-white"
                style={selectedCustomer.stamps >= selectedCustomer.maxStamps
                  ? { backgroundColor: "#16a34a" }
                  : { backgroundColor: selectedCustomer.cardBrandColor }
                }
              >
                {actionLoading ? (
                  <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                ) : selectedCustomer.stamps >= selectedCustomer.maxStamps ? (
                  <>
                    <Gift className="h-6 w-6 mr-3" />
                    Canjear Recompensa
                  </>
                ) : (
                  <>
                    <Stamp className="h-6 w-6 mr-3" />
                    Agregar Sello
                  </>
                )}
              </Button>
            </div>
          )}

          {(scanState === "stamped" || scanState === "redeemed") && selectedCustomer && (
            <div className="text-center space-y-6">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
                style={scanState === "redeemed"
                  ? { backgroundColor: "#dcfce7" }
                  : { backgroundColor: `${selectedCustomer.cardBrandColor}1a` }
                }
              >
                {scanState === "redeemed" ? (
                  <Gift className="h-12 w-12 text-green-600" />
                ) : (
                  <Check className="h-12 w-12" style={{ color: selectedCustomer.cardBrandColor }} />
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {scanState === "redeemed" ? "¡Recompensa Canjeada!" : "¡Sello Agregado!"}
                </h2>
                <p className="text-muted-foreground">
                  {scanState === "redeemed"
                    ? `${selectedCustomer.name} ha canjeado su recompensa`
                    : `${selectedCustomer.name} ahora tiene ${selectedCustomer.stamps} sellos`}
                </p>
              </div>

              {scanState === "stamped" && (
                <div className="bg-card rounded-xl p-4 border border-border">
                  <div className="grid grid-cols-10 gap-1.5">
                    {Array.from({ length: selectedCustomer.maxStamps }).map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-lg ${i >= selectedCustomer.stamps ? "bg-muted border border-border" : ""}`}
                        style={{
                          ...(i < selectedCustomer.stamps ? { backgroundColor: selectedCustomer.cardBrandColor } : {}),
                          ...(i === selectedCustomer.stamps - 1 ? { outline: `2px solid ${selectedCustomer.cardBrandColor}`, outlineOffset: "2px" } : {}),
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {scanState === "stamped" && (() => {
                const days = daysUntilExpiry(selectedCustomer.cardExpiresAt)
                if (days === null || days > 3) return null
                return (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {days === 0
                        ? "Esta tarjeta vence hoy — avisa al cliente."
                        : `Esta tarjeta vence en ${days} día${days !== 1 ? "s" : ""} — avisa al cliente.`}
                    </span>
                  </div>
                )
              })()}

              <Button
                onClick={resetScan}
                size="lg"
                className="w-full text-white"
                style={{ backgroundColor: selectedCustomer.cardBrandColor }}
              >
                Escanear Siguiente Cliente
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ScanPageInner />
    </Suspense>
  )
}
