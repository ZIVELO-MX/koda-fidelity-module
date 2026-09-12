"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconPicker } from "@/components/dashboard/icon-picker"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { Upload, Check, ChevronDown, Loader2 } from "lucide-react"
import { getCardIcon } from "@/lib/card-icons"

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
    reader.onload = (ev) => {
      setLogoUrl(ev.target?.result as string)
      // Subir un logo es decir que quieres usarlo. La vista previa solo lo pinta
      // si además está elegido como ícono de la tarjeta, así que subirlo y no
      // verlo parecía que la subida había fallado. Si ya elegiste otro ícono a
      // propósito, no se toca.
      setIconName((actual) => actual ?? "logo")
    }
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

  const nombreDeIcono = (valor: string | null) =>
    valor === "logo" ? "logo" : valor ? getCardIcon(valor)?.label.toLowerCase() ?? valor : null

  const resumenDeIconos = [
    `Tarjeta: ${nombreDeIcono(iconName) ?? "sin ícono"}`,
    `Sello: ${nombreDeIcono(stampIconName) ?? "un sello"}`,
  ].join(" · ")

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">Marca</h1>
        <p className="text-muted-foreground">
          Cómo se ven tus tarjetas. Es la plantilla de las que crees a partir de ahora.
        </p>
      </div>

      {/* Una sola superficie: controles a la izquierda, la tarjeta fija a la
          derecha. Antes eran seis tarjetas apiladas con la vista previa al
          final. */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        {/* Marca es la dueña del nombre: es donde se ve sobre la tarjeta y donde
            la vista previa lo refleja al escribir. Configuración lo muestra sin
            editarlo. */}
        <div className="space-y-2">
          <Label htmlFor="businessName">Nombre del negocio</Label>
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

        {/* Logo, a la vista. */}
        <div className="space-y-3">
          <Label>Logo del negocio</Label>
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
              Cuadrado, 512×512 px va bien. Al subirlo se usa como ícono de la tarjeta.
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
              <Button variant="outline" className="min-h-11" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {logoUrl ? "Cambiar logo" : "Subir logo"}
              </Button>
              {logoUrl && (
                <Button variant="ghost" className="min-h-11 text-destructive" onClick={() => { setLogoUrl(""); setLogoError(null) }}>
                  Quitar
                </Button>
              )}
            </div>
            {logoError && (
              <p role="alert" className="text-sm text-destructive">{logoError}</p>
            )}
          </div>
          </div>
        </div>

        {/* Color, a la vista: junto con el logo es lo que de verdad cambia la
            tarjeta. */}
        <div className="space-y-3">
          <Label>Color de marca</Label>
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
              className="h-10 w-10 cursor-pointer rounded-lg border-0"
            />
            <Input
              name="brandColor"
              aria-label="Color de marca en hexadecimal"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-28 font-mono text-sm"
              placeholder="#f97316"
            />
          </div>
        </div>
      </div>

      {/* Los dos selectores de ícono se pliegan: se tocan una vez y luego
          estorban entre el logo y el color, que son los que se ajustan. */}
      <details className="group rounded-2xl border border-border bg-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block font-medium text-foreground">Íconos</span>
            <span className="block text-xs text-muted-foreground">{resumenDeIconos}</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>

        <div className="space-y-6 border-t border-border p-6">
          <div className="space-y-3">
            <Label>Ícono de la tarjeta</Label>
            <p className="text-xs text-muted-foreground">
              {logoUrl
                ? "Ábrelo para elegir el logo de tu negocio o un ícono."
                : "Aparece en la tarjeta cuando no hay logo."}
            </p>
            <IconPicker value={iconName} onChange={setIconName} businessLogoUrl={logoUrl || undefined} />
          </div>

          <div className="space-y-3">
            <Label>Ícono del sello</Label>
            <p className="text-xs text-muted-foreground">
              Se muestra en las celdas selladas. Si no eliges uno, se usa un sello.
            </p>
            <IconPicker value={stampIconName} onChange={setStampIconName} businessLogoUrl={logoUrl || undefined} />
          </div>
        </div>
      </details>
    </div>

    {/* La vista previa se queda fija al lado, con el guardado debajo. Antes
        vivía al final de seis tarjetas apiladas, así que ajustabas un color
        arriba y tenías que bajar para ver el efecto. */}
    <div className="h-fit lg:sticky lg:top-24">
      <div className="rounded-2xl border border-border bg-muted/30 p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Así queda</h2>
          <div className="flex w-full overflow-hidden rounded-lg border border-border text-xs sm:w-auto">
            {(["normal", "sellada"] as const).map((modo) => (
              <button
                key={modo}
                type="button"
                aria-pressed={previewMode === modo}
                onClick={() => setPreviewMode(modo)}
                className={`min-h-10 flex-1 px-3 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none ${
                  previewMode === modo
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {modo === "normal" ? "A medias" : "Completa"}
              </button>
            ))}
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

        {/* Una sola barra de guardado, junto a lo que estás mirando. */}
        <Button onClick={handleSave} className="mt-6 min-h-11 w-full" disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="mr-2 h-4 w-4" />
          ) : null}
          {saved ? "¡Guardado!" : "Guardar cambios"}
        </Button>
        {saveError && (
          <p role="alert" className="mt-2 text-center text-sm text-destructive">{saveError}</p>
        )}
      </div>
    </div>
      </div>
    </div>
  )
}
