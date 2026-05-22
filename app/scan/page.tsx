"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Camera, 
  Stamp, 
  Check, 
  Gift, 
  ArrowLeft, 
  Search,
  User,
  X
} from "lucide-react"

// Mock customer data
const mockCustomers = [
  { id: "1", name: "Sarah Mitchell", stamps: 7, maxStamps: 10, card: "Coffee Rewards" },
  { id: "2", name: "John Davidson", stamps: 10, maxStamps: 10, card: "Coffee Rewards" },
  { id: "3", name: "Emma Wilson", stamps: 3, maxStamps: 8, card: "Lunch Special" },
]

type ScanState = "idle" | "scanning" | "found" | "stamped" | "redeemed"

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>("idle")
  const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomers[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCustomers = mockCustomers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const simulateScan = () => {
    setScanState("scanning")
    setTimeout(() => {
      const customer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)]
      setSelectedCustomer(customer)
      setScanState("found")
    }, 1500)
  }

  const addStamp = () => {
    if (!selectedCustomer) return
    
    if (selectedCustomer.stamps >= selectedCustomer.maxStamps) {
      // Redeem reward
      setScanState("redeemed")
    } else {
      // Add stamp
      setSelectedCustomer({
        ...selectedCustomer,
        stamps: selectedCustomer.stamps + 1,
      })
      setScanState("stamped")
    }
  }

  const resetScan = () => {
    setScanState("idle")
    setSelectedCustomer(null)
    setSearchQuery("")
  }

  const selectCustomer = (customer: typeof mockCustomers[0]) => {
    setSelectedCustomer(customer)
    setScanState("found")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">K</span>
            </div>
            <span className="font-semibold text-foreground">Escáner de Sellos</span>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {scanState === "idle" && (
            <div className="space-y-6">
              {/* Scanner Area */}
              <div 
                onClick={simulateScan}
                className="aspect-square max-h-[300px] bg-muted/50 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 hover:border-primary/50 transition-all"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground">Toca para Escanear</p>
                <p className="text-sm text-muted-foreground">
                  Escanea el código QR del cliente
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">o buscar</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Manual Search */}
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
                
                {searchQuery && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {filteredCustomers.length > 0 ? (
                      <div className="divide-y divide-border">
                        {filteredCustomers.map((customer) => (
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
                                <p className="text-xs text-muted-foreground">{customer.card}</p>
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
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        No se encontraron clientes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {scanState === "scanning" && (
            <div className="aspect-square max-h-[300px] bg-foreground rounded-3xl flex flex-col items-center justify-center">
              <div className="relative">
                {/* Scanning animation */}
                <div className="w-48 h-48 border-4 border-white/30 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                  {/* Scanning line */}
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-primary animate-pulse" />
                </div>
              </div>
              <p className="text-white mt-6 font-medium">Escaneando...</p>
            </div>
          )}

          {scanState === "found" && selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Card */}
              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-foreground">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.card}</p>
                    </div>
                  </div>
                  <button
                    onClick={resetScan}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Stamps Progress */}
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
                        className={`aspect-square rounded-lg ${
                          i < selectedCustomer.stamps
                            ? "bg-primary"
                            : "bg-muted border border-border"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Status */}
                {selectedCustomer.stamps >= selectedCustomer.maxStamps ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <Gift className="h-6 w-6 text-green-600" />
                    <div>
                    <p className="font-medium text-green-800">¡Recompensa Lista!</p>
                    <p className="text-sm text-green-600">El cliente puede canjear su recompensa</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3">
                    <Stamp className="h-6 w-6 text-primary" />
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

              {/* Action Button */}
              <Button
                onClick={addStamp}
                size="lg"
                className={`w-full h-16 text-lg ${
                  selectedCustomer.stamps >= selectedCustomer.maxStamps
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }`}
              >
                  {selectedCustomer.stamps >= selectedCustomer.maxStamps ? (
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

          {(scanState === "stamped" || scanState === "redeemed") && (
            <div className="text-center space-y-6">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
                  scanState === "redeemed" ? "bg-green-100" : "bg-primary/10"
                }`}
              >
                {scanState === "redeemed" ? (
                  <Gift className="h-12 w-12 text-green-600" />
                ) : (
                  <Check className="h-12 w-12 text-primary" />
                )}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {scanState === "redeemed" ? "¡Recompensa Canjeada!" : "¡Sello Agregado!"}
                </h2>
                <p className="text-muted-foreground">
                  {scanState === "redeemed"
                    ? `${selectedCustomer?.name} ha canjeado su recompensa`
                    : `${selectedCustomer?.name} ahora tiene ${selectedCustomer?.stamps} sellos`}
                </p>
              </div>

              {scanState === "stamped" && selectedCustomer && (
                <div className="bg-card rounded-xl p-4 border border-border">
                  <div className="grid grid-cols-10 gap-1.5">
                    {Array.from({ length: selectedCustomer.maxStamps }).map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-lg ${
                          i < selectedCustomer.stamps
                            ? "bg-primary"
                            : "bg-muted border border-border"
                        } ${i === selectedCustomer.stamps - 1 ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={resetScan} size="lg" className="w-full">
                Escanear Siguiente Cliente
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
