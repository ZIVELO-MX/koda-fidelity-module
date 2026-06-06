"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Mail,
  Globe,
  Loader2,
  Check,
  LogOut,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { logout } from "@/lib/actions/auth"

interface MobileSettingsPanelProps {
  userEmail: string
  businessName: string
  brandColor: string
  onClose: () => void
}

export function MobileSettingsPanel({
  userEmail,
  businessName,
  brandColor,
  onClose,
}: MobileSettingsPanelProps) {
  const [name, setName] = useState("")
  const [nickname, setNickname] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [instagram, setInstagram] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetch("/api/business")
      .then((res) => res.json())
      .then((data) => {
        if (data.business) {
          setName(data.business.name)
          setNickname(data.business.nickname ?? "")
          setEmail(data.business.email)
          setBusinessType(data.business.businessType ?? "")
          setAddress(data.business.address ?? "")
          setPhone(data.business.phone ?? "")
          setWebsite(data.business.website ?? "")
          setInstagram(data.business.instagram ?? "")
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nickname, businessType, address, phone, website, instagram }),
      })
      if (res.ok) {
        setSaved(true)
        setSaveError(null)
        setTimeout(() => setSaved(false), 2000)
      } else {
        throw new Error("No fue posible guardar los cambios")
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar sesión</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cerrar sesión?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => await logout()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-foreground">Configuración</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile strip */}
          <div className="flex items-center gap-4 px-6 py-5 border-b border-border bg-card">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center font-bold text-white text-2xl shrink-0 shadow"
              style={{ backgroundColor: brandColor }}
            >
              {businessName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{businessName}</p>
              <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-20 px-6">
              <p className="text-muted-foreground mb-4">No pudimos cargar la configuración.</p>
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </div>
          ) : (
            <div className="space-y-6 p-6 pb-10">
              {/* Business info */}
              <div className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Información del Negocio</p>
                    <p className="text-xs text-muted-foreground">Detalles básicos</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-name">Nombre del Negocio</Label>
                    <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-type">Tipo de Negocio</Label>
                    <Input id="m-type" value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-nickname">Apodo (visible en el panel)</Label>
                    <Input
                      id="m-nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Ej. Juan, El Jefe..."
                      maxLength={40}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se muestra en lugar de tu correo en el panel.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-address">Dirección</Label>
                    <Input id="m-address" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-phone">Teléfono</Label>
                    <Input id="m-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Correo de contacto</p>
                    <p className="text-xs text-muted-foreground">Actualizaciones importantes</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-email">Correo Electrónico</Label>
                  <Input id="m-email" type="email" value={email} disabled />
                </div>
              </div>

              {/* Web & Social */}
              <div className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Sitio Web y Redes</p>
                    <p className="text-xs text-muted-foreground">Tu presencia en línea</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-website">Sitio Web</Label>
                    <Input id="m-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-instagram">Instagram</Label>
                    <Input id="m-instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Save */}
              {saveError && (
                <p className="text-sm text-destructive text-center">{saveError}</p>
              )}
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
                ) : saved ? (
                  <><Check className="h-4 w-4 mr-2" />¡Guardado!</>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>

              {/* Bottom actions */}
              <div className="border-t border-border pt-6 space-y-2">
                <Link
                  href="/dashboard/my-cards"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  <Smartphone className="h-4 w-4" />
                  Mis Tarjetas
                </Link>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setConfirmOpen(true)}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
