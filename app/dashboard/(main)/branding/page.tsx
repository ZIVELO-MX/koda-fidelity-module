"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { getCardIcon } from "@/lib/card-icons"
import { Upload, Check, Loader2 } from "lucide-react"

const colorPresets = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b",
]

export default function BrandingPage() {
  const [brandColor, setBrandColor] = useState("#f97316")
  const [businessName, setBusinessName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [iconName, setIconName] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/business")
      .then((res) => res.json())
      .then((data) => {
        if (data.business) {
          setBusinessName(data.business.name)
          setBrandColor(data.business.brandColor || "#f97316")
          setLogoUrl(data.business.logoUrl || "")
          setIconName(data.business.iconName || null)
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: businessName,
          brandColor,
          logoUrl: logoUrl || null,
          iconName: iconName || null,
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
        <p className="text-muted-foreground mb-6">No pudimos cargar los datos de tu marca.</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    )
  }

  const previewIcon = getCardIcon(iconName)
  const PreviewIcon = previewIcon?.Icon

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marca</h1>
        <p className="text-muted-foreground">
          Personaliza cómo se ven tus tarjetas. Estos datos se usan como plantilla al crear nuevas tarjetas.
        </p>
      </div>

      {/* Business Name */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-2">
        <h2 className="font-semibold text-foreground">Nombre del Negocio</h2>
        <Label htmlFor="businessName" className="sr-only">Nombre Visible</Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Ingresa el nombre de tu negocio"
        />
        <p className="text-xs text-muted-foreground">
          Aparece en las tarjetas de lealtad y comunicaciones con clientes.
        </p>
      </div>

      {/* Logo Upload */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="font-semibold text-foreground">Logo del Negocio <span className="text-muted-foreground font-normal text-sm">(opcional)</span></h2>
        <div className="flex items-start gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0 overflow-hidden"
            style={{ backgroundColor: brandColor }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : PreviewIcon ? (
              <PreviewIcon className="h-9 w-9" />
            ) : (
              businessName.charAt(0)
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sube un logo cuadrado (recomendado 512×512 px). Aparecerá en tus tarjetas y páginas para clientes.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {logoUrl ? "Cambiar Logo" : "Subir Logo"}
              </Button>
              {logoUrl && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setLogoUrl("")}>
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Icon Selection */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Ícono de Marca <span className="text-muted-foreground font-normal text-sm">(opcional)</span></h2>
          <p className="text-sm text-muted-foreground mt-1">
            Se usa cuando no tienes un logo. Aparece en la tarjeta como símbolo de tu negocio.
          </p>
        </div>
        <IconPicker value={iconName} onChange={setIconName} />
      </div>

      {/* Brand Color */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="font-semibold text-foreground">Color de Marca</h2>
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">Colores rápidos</Label>
          <div className="flex flex-wrap gap-3">
            {colorPresets.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setBrandColor(color)}
                className={`w-10 h-10 rounded-xl transition-all ${
                  brandColor === color
                    ? "ring-2 ring-offset-2 ring-foreground scale-110"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="customColor"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0"
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-28 font-mono text-sm"
              placeholder="#f97316"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="font-semibold text-foreground">Vista Previa de Tarjeta</h2>
        <div className="bg-muted/30 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold overflow-hidden shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : PreviewIcon ? (
                <PreviewIcon className="h-7 w-7" />
              ) : (
                businessName.charAt(0) || "N"
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{businessName || "Tu Negocio"}</p>
              <p className="text-sm text-muted-foreground">Tarjeta de Lealtad</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg ${i <= 3 ? "" : "border-2 border-dashed border-border"}`}
                style={i <= 3 ? { backgroundColor: brandColor } : {}}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex flex-col items-end gap-3">
        {saveError && <p className="text-sm text-destructive text-right">{saveError}</p>}
        <Button onClick={handleSave} className="px-8" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : saved ? (
            <Check className="h-4 w-4 mr-2" />
          ) : null}
          {saved ? "¡Guardado!" : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  )
}
