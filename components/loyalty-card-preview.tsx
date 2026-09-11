"use client"

import { QRCodeSVG } from "qrcode.react"
import { Stamp } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCardIcon } from "@/lib/card-icons"
import { PatronDeIconos } from "@/components/patron-de-iconos"


/** Aclara u oscurece un hex hacia un tono, para los dos extremos del degradado. */
function mezclar(hex: string, hacia: number, cantidad: number): string {
  const limpio = hex.replace("#", "")
  if (limpio.length !== 6) return hex
  const canal = (i: number) => {
    const v = parseInt(limpio.slice(i, i + 2), 16)
    return Math.round(v + (hacia - v) * cantidad)
  }
  return `rgb(${canal(0)}, ${canal(2)}, ${canal(4)})`
}

interface LoyaltyCardPreviewProps {
  businessName: string
  businessLogo?: string
  iconName?: string | null
  stampIconName?: string | null
  customerName?: string
  currentStamps: number
  maxStamps: number
  reward: string
  expirationDate?: string
  brandColor?: string
  className?: string
  showQR?: boolean
  qrValue?: string
  onMemberClick?: () => void
  milestoneClaims?: { stampNumber: number; iconName: string | null }[]
}

export function LoyaltyCardPreview({
  businessName,
  businessLogo,
  iconName,
  stampIconName,
  customerName = "Tu Nombre",
  currentStamps,
  maxStamps,
  reward,
  expirationDate,
  brandColor = "#f97316",
  className,
  showQR = true,
  qrValue = "https://fidelity.zivelo.dev/card/demo",
  onMemberClick,
  milestoneClaims = [],
}: LoyaltyCardPreviewProps) {
  const stamps = Array.from({ length: maxStamps }, (_, i) => i < currentStamps)
  const milestonePositions = new Map(milestoneClaims.map(c => [c.stampNumber, c]))

  // El ícono del negocio hace de textura. Si no hay, la tarjeta va limpia.
  const iconoDelNegocio = getCardIcon(iconName)?.Icon
  const patron = iconoDelNegocio ? [iconoDelNegocio] : null

  const fg = "#ffffff"
  const fgMuted = "rgba(255,255,255,0.6)"
  const fgMuted2 = "rgba(255,255,255,0.7)"
  const overlay = "rgba(255,255,255,0.12)"
  const overlayIcon = "rgba(255,255,255,0.2)"
  const stampBg = "rgba(255,255,255,0.95)"
  const stampBorder = "rgba(255,255,255,0.3)"
  const footerBg = "rgba(0,0,0,0.1)"

  return (
    <div
      className={cn(
        "relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-xl dark:ring-1 dark:ring-white/10",
        className,
      )}
      style={{
        // Degradado en vez de plano: es lo que distingue una tarjeta de un
        // rectángulo de color, y es lo que ya usan los temas por giro.
        backgroundImage: `radial-gradient(120% 130% at 18% 4%, ${mezclar(brandColor, 255, 0.16)}, ${mezclar(brandColor, 0, 0.22)})`,
        backgroundColor: brandColor,
      }}
    >
      {/* El patrón del ícono del negocio. Sin él la tarjeta es un color plano,
          y era la pieza que separaba la landing del producto. */}
      {patron && <PatronDeIconos iconos={patron} opacidad={0.12} columnas={4} filas={5} />}

      {/* Hero section */}
      <div className="relative px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          {iconName === "logo" && businessLogo ? (
            <img
              src={businessLogo}
              alt={businessName}
              className="w-16 h-16 rounded-2xl object-contain p-1"
            />
          ) : (() => {
            const icon = getCardIcon(iconName)
            const IconComp = icon?.Icon
            return (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl"
                style={{ backgroundColor: overlayIcon, color: fg }}
              >
                {IconComp ? <IconComp className="h-7 w-7" /> : businessName.charAt(0)}
              </div>
            )
          })()}
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: fgMuted }}>Tarjeta de Lealtad</p>
            <h3 className="font-semibold text-lg leading-tight" style={{ color: fg }}>{businessName}</h3>
          </div>
        </div>

        {/* Customer name */}
        <div
          className={`rounded-xl px-4 py-3 mb-2 ${onMemberClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
          style={{ backgroundColor: overlay }}
          onClick={onMemberClick}
          role={onMemberClick ? "button" : undefined}
          tabIndex={onMemberClick ? 0 : undefined}
          onKeyDown={onMemberClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMemberClick() } } : undefined}
        >
          <p className="text-xs mb-0.5" style={{ color: fgMuted }}>Miembro</p>
          <p className="font-medium" style={{ color: fg }}>{customerName}</p>
        </div>
      </div>

      {/* Stamps section */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: fg }}>Tu Progreso</p>
          <p className="text-sm" style={{ color: fgMuted2 }}>
            {currentStamps}/{maxStamps}
          </p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {stamps.map((filled, i) => {
            const stampPosition = i + 1
            const milestoneClaim = milestonePositions.get(stampPosition)
            const isMilestone = !!milestoneClaim

            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center",
                  isMilestone && filled
                    ? "shadow-md"
                    : filled
                      ? "stamp-filled shadow-sm"
                      : "border-2 border-dashed",
                )}
                style={
                  isMilestone && filled
                    ? { backgroundColor: brandColor, boxShadow: "0 0 0 2px rgba(255,255,255,0.4) inset" }
                    : filled
                      ? {
                          backgroundColor: stampBg,
                          transitionDelay: `${i * 55}ms`,
                        }
                      : { borderColor: stampBorder }
                }
              >
                {filled && (() => {
                  if (isMilestone) {
                    const milestoneIcon = getCardIcon(milestoneClaim.iconName)
                    const MilestoneIconComp = milestoneIcon?.Icon ?? Stamp
                    return <MilestoneIconComp className="w-5 h-5" style={{ color: "#ffffff" }} strokeWidth={2} />
                  }
                  // El sello no hereda el ícono de la tarjeta: son dos decisiones
                  // distintas, y heredarlo hacía que elegir el ícono de la
                  // tarjeta cambiara los sellos sin pedirlo. Sin elección propia,
                  // un sello es un sello.
                  if (stampIconName === "logo" && businessLogo) {
                    return <img src={businessLogo} alt="" className="w-5 h-5 object-contain rounded" />
                  }
                  const cardIcon = getCardIcon(stampIconName)
                  const StampIcon = cardIcon?.Icon ?? Stamp
                  return <StampIcon className="w-5 h-5" style={{ color: brandColor }} strokeWidth={2} />
                })()}
              </div>
            )
          })}
        </div>
      </div>

      {/* Reward */}
      <div className="px-6 pb-4">
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ backgroundColor: overlay }}
        >
          <p className="text-xs mb-0.5" style={{ color: fgMuted }}>Premio</p>
          <p className="font-semibold" style={{ color: fg }}>{reward}</p>
        </div>
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="flex justify-center pb-4">
          <div
            className="rounded-xl p-2"
            style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
          >
            <QRCodeSVG
              value={qrValue}
              size={80}
              level="M"
              fgColor={brandColor}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-6 py-3 text-xs"
        style={{ backgroundColor: footerBg }}
      >
        {expirationDate && <span style={{ color: fgMuted }}>Vence: {expirationDate}</span>}
        <span className="ml-auto" style={{ color: fgMuted }}>Con tecnología de Koda</span>
      </div>
    </div>
  )
}
