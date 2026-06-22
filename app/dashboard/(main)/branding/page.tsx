"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { Upload, Check, Loader2 } from "lucide-react"

const colorPresets = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b",
]

export default function BrandingPage() {
  const [brandColor, setBrandColor] = useState("#f97316")
  const [businessName, setBusinessName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [iconName, setIconName] = useState<string | null>(null)
  const [stampIconName, setStampIconName] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"normal" | "sellada">("normal")
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_LOGO_MB = 2
  const PREVIEW_MAX_STAMPS = 10

  useEffect(() => {
    fetch("/api/business")
      .then((res) => res.json())
      .then((data) => {
        if (data.business) {
          setBusinessName(data.business.name)
          setBrandColor(data.business.brandColor || "#f97316")
          setLogoUrl(data.business.logoUrl || "")
          setIconName(data.business.iconName || null)
          setStampIconName(data.business.stampIconName || null)
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setLogoError(`El archivo es demasiado grande. El máximo permitido es ${MAX_LOGO_MB} MB.`)
      e.target.value = ""
      return
    }
    setLogoError(null)
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
          stampIconName: stampIconName || null,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setSaveError(null)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Error del servidor (${res.status})`)
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">Marca</h1>
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
          name="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Ingresa el nombre de tu negocio…"
        />
        <p className="text-xs text-muted-foreground">
          Aparece en las tarjetas de lealtad y comunicaciones con clientes.
        </p>
      </div>

      {/* Logo Upload */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="font-semibold text-foreground">Logo del Negocio <span className="text-muted-foreground font-normal text-sm">(opcional)</span></h2>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0 overflow-hidden relative"
            style={{ backgroundColor: brandColor }}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" />
            ) : (
              businessName.charAt(0)
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sube un logo cuadrado (recomendado 512×512 px). Habilita la opción &ldquo;Logo&rdquo; en los pickers de ícono.
            </p>
            <input
              ref={fileInputRef}
              id="businessLogo"
              name="businessLogo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {logoUrl ? "Cambiar Logo" : "Subir Logo"}
              </Button>
              {logoUrl && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setLogoUrl(""); setLogoError(null) }}>
                  Quitar
                </Button>
              )}
            </div>
            {logoError && (
              <p className="text-sm text-destructive">{logoError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Icon Selection */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Ícono de Marca <span className="text-muted-foreground font-normal text-sm">(opcional)</span></h2>
          <p className="text-sm text-muted-foreground mt-1">
            Aparece en la tarjeta cuando no hay logo. Si subiste logo, puedes seleccionarlo como ícono.
          </p>
        </div>
        <IconPicker value={iconName} onChange={setIconName} businessLogoUrl={logoUrl || undefined} />
      </div>

      {/* Stamp Icon Selection */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Ícono del Sello <span className="text-muted-foreground font-normal text-sm">(opcional)</span></h2>
          <p className="text-sm text-muted-foreground mt-1">
            Se muestra en las celdas selladas. Si no se elige, usa el mismo ícono de marca.
          </p>
        </div>
        <IconPicker value={stampIconName} onChange={setStampIconName} businessLogoUrl={logoUrl || undefined} />
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
                aria-label={`Usar color ${color}`}
                aria-pressed={brandColor === color}
                className={`h-10 w-10 rounded-xl transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
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
              name="customColor"
              aria-label="Color personalizado"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0"
            />
            <Input
              name="brandColor"
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-foreground">Vista Previa de Tarjeta</h2>
          <div className="flex w-full items-center gap-1 rounded-lg bg-muted p-1 sm:w-auto">
            <button
              type="button"
              aria-pressed={previewMode === "normal"}
              onClick={() => setPreviewMode("normal")}
              className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none ${previewMode === "normal" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Normal
            </button>
            <button
              type="button"
              aria-pressed={previewMode === "sellada"}
              onClick={() => setPreviewMode("sellada")}
              className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none ${previewMode === "sellada" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sellada
            </button>
          </div>
        </div>
        <LoyaltyCardPreview
          businessName={businessName || "Tu Negocio"}
          businessLogo={logoUrl || undefined}
          iconName={iconName}
          stampIconName={stampIconName}
          brandColor={brandColor}
          currentStamps={previewMode === "sellada" ? PREVIEW_MAX_STAMPS : Math.floor(PREVIEW_MAX_STAMPS * 0.6)}
          maxStamps={PREVIEW_MAX_STAMPS}
          reward="Tu recompensa aquí"
          showQR={false}
        />
      </div>

      {/* Save */}
      <div className="flex flex-col items-center gap-3">
        {saveError && <p className="text-sm text-destructive text-center">{saveError}</p>}
        <Button onClick={handleSave} className="px-10" disabled={saving}>
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
