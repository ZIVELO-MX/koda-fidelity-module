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
import { getCardIcon } from "@/lib/card-icons"

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
  const [milestoneClaim, setMilestoneClaim] = useState<{ id: string; label: string; iconName: string | null } | null>(null)
  // La cámara abre sola: sellar es la razón por la que se entra a esta pantalla.
  const [useCamera, setUseCamera] = useState(true)
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

  // La acción se pide, no se adivina: la pantalla ofrece sellar y canjear, y
  // quien sella elige. El tipo viaja explícito al servidor.
  const ejecutar = async (type: "stamp" | "redeem") => {
    if (!selectedCustomer) return
    setActionLoading(true)
    setActionError(null)

    try {
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
        setMilestoneClaim(data.milestoneClaim ?? null)
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
    setMilestoneClaim(null)
    setCameraError(null)
    setUseCamera(true)
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
                {useCamera && (
                  <QRScanner
                    onScan={handleScanResult}
                    onError={(err) => {
                      // Si la cámara falló, se apaga: así el botón ofrece
                      // reintentar en vez de decir que sigue encendida.
                      setCameraError(err)
                      setUseCamera(false)
                    }}
                  />
                )}

                {cameraError && (
                  <p className="text-sm text-red-500 text-center">{cameraError}</p>
                )}

                {/* El botón solo apaga la cámara, o la recupera cuando el permiso
                    falló. Abrirla no es una decisión que haya que tomar cada vez. */}
                <Button
                  onClick={() => {
                    setCameraError(null)
                    setUseCamera(!useCamera)
                  }}
                  variant="outline"
                  className="w-full min-h-11"
                  size="lg"
                >
                  {useCamera ? (
                    <>
                      <Scan className="h-5 w-5 mr-2" />
                      Apagar cámara
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      {cameraError ? "Reintentar cámara" : "Encender cámara"}
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-3">
                <label htmlFor="buscar-cliente" className="text-sm font-medium text-foreground">
                  Buscar por nombre
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="buscar-cliente"
                    placeholder="Nombre del cliente"
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

              {(() => {
                const completa = selectedCustomer.stamps >= selectedCustomer.maxStamps
                return (
                  <div className="space-y-3">
                    <Button
                      onClick={() => ejecutar("stamp")}
                      disabled={actionLoading || completa}
                      size="lg"
                      variant={completa ? "outline" : "default"}
                      className="w-full h-16 text-lg"
                      style={completa ? undefined : { backgroundColor: selectedCustomer.cardBrandColor, color: "#FFFFFF" }}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                      ) : (
                        <Stamp className="h-6 w-6 mr-3" />
                      )}
                      Agregar Sello
                    </Button>

                    {completa && (
                      <p className="text-sm text-muted-foreground text-center">
                        La tarjeta está llena. Canjea la recompensa para volver a sellar.
                      </p>
                    )}

                    <Button
                      onClick={() => ejecutar("redeem")}
                      disabled={actionLoading || !completa}
                      size="lg"
                      variant={completa ? "default" : "outline"}
                      className="w-full h-12 text-base"
                      style={completa ? { backgroundColor: "#16a34a", color: "#FFFFFF" } : undefined}
                    >
                      <Gift className="h-5 w-5 mr-3" />
                      Canjear Recompensa
                    </Button>

                    {!completa && (
                      <p className="text-sm text-muted-foreground text-center">
                        Faltan {selectedCustomer.maxStamps - selectedCustomer.stamps} sellos para poder canjear.
                      </p>
                    )}
                  </div>
                )
              })()}
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

              {/* El bono se anuncia en la propia pantalla. Un diálogo bloqueante
                  obligaba a despacharlo antes de seguir atendiendo. */}
              {milestoneClaim && (() => {
                const milestoneIcon = getCardIcon(milestoneClaim.iconName)
                const MilestoneIconComp = milestoneIcon?.Icon
                return (
                  <div
                    role="status"
                    className="anuncio-entra flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left dark:border-amber-800 dark:bg-amber-950/20"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: selectedCustomer.cardBrandColor }}
                    >
                      {MilestoneIconComp ? (
                        <MilestoneIconComp className="h-6 w-6 text-white" />
                      ) : (
                        <Gift className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        Bono sorpresa: {milestoneClaim.label}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Avísale a {selectedCustomer.name} antes de que se vaya.
                      </p>
                    </div>
                  </div>
                )
              })()}

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
