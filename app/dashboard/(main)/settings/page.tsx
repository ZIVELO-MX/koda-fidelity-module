"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Building2, Mail, Loader2, Globe } from "lucide-react"

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("")
  const [nickname, setNickname] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [instagram, setInstagram] = useState("")
  const [email, setEmail] = useState("")
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/business")
      .then((res) => res.json())
      .then((data) => {
        if (data.business) {
          setBusinessName(data.business.name)
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
        body: JSON.stringify({
          name: businessName,
          nickname,
          businessType,
          address,
          phone,
          website,
          instagram,
        }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-semibold text-foreground mb-2">Error al cargar</h3>
        <p className="text-muted-foreground mb-6">No pudimos cargar la configuración.</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Gestiona tu cuenta y configuración del negocio</p>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Información del Negocio</h2>
            <p className="text-sm text-muted-foreground">Detalles básicos sobre tu negocio</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre del Negocio</Label>
              <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Tipo de Negocio</Label>
              <Input id="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">Apodo (visible en el panel)</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej. Juan, El Jefe, Administrador..."
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">
              Se muestra en lugar de tu correo electrónico en el panel. Solo para uso interno.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Correo electrónico de contacto</h2>
            <p className="text-sm text-muted-foreground">Donde enviamos actualizaciones importantes</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input id="email" type="email" value={email} disabled />
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ThemeToggle className="text-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Apariencia</h2>
            <p className="text-sm text-muted-foreground">Cambia entre modo claro y oscuro</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Activar modo oscuro</span>
          <ThemeToggle />
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Sitio Web y Redes</h2>
            <p className="text-sm text-muted-foreground">Tu presencia en línea</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website">Sitio Web</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex flex-col items-end gap-3">
        {saveError && (
          <p className="text-sm text-red-500 text-right">{saveError}</p>
        )}
        <Button onClick={handleSave} className="px-8" disabled={saving}>
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              ¡Guardado!
            </>
          ) : saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </Button>
      </div>
    </div>
  )
}
