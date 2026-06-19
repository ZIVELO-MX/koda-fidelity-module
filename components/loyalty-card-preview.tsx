"use client"

import { QRCodeSVG } from "qrcode.react"
import { Stamp } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCardIcon } from "@/lib/card-icons"

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
}: LoyaltyCardPreviewProps) {
  const stamps = Array.from({ length: maxStamps }, (_, i) => i < currentStamps)
  const progress = Math.round((currentStamps / maxStamps) * 100)

  return (
    <div
      className={cn(
        "relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-xl dark:ring-1 dark:ring-white/10",
        className,
      )}
      style={{ backgroundColor: brandColor }}
    >
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
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                {IconComp ? <IconComp className="h-7 w-7" /> : businessName.charAt(0)}
              </div>
            )
          })()}
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide">Tarjeta de Lealtad</p>
            <h3 className="font-semibold text-white text-lg leading-tight">{businessName}</h3>
          </div>
        </div>

        {/* Customer name */}
        <div
          className={`rounded-xl px-4 py-3 mb-2 ${onMemberClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          onClick={onMemberClick}
          role={onMemberClick ? "button" : undefined}
          tabIndex={onMemberClick ? 0 : undefined}
          onKeyDown={onMemberClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMemberClick() } } : undefined}
        >
          <p className="text-white/60 text-xs mb-0.5">Miembro</p>
          <p className="font-medium text-white">{customerName}</p>
        </div>
      </div>

      {/* Stamps section */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white/90">Tu Progreso</p>
          <p className="text-sm text-white/70">
            {currentStamps}/{maxStamps}
          </p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {stamps.map((filled, i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-xl flex items-center justify-center",
                filled
                  ? "stamp-filled shadow-sm"
                  : "border-2 border-dashed",
              )}
              style={
                filled
                  ? {
                      backgroundColor: "rgba(255,255,255,0.95)",
                      transitionDelay: `${i * 55}ms`,
                    }
                  : { borderColor: "rgba(255,255,255,0.3)" }
              }
            >
              {filled && (() => {
                const effectiveStampIcon = stampIconName ?? iconName
                if (effectiveStampIcon === "logo" && businessLogo) {
                  return <img src={businessLogo} alt="" className="w-5 h-5 object-contain rounded" />
                }
                const cardIcon = getCardIcon(effectiveStampIcon)
                const StampIcon = cardIcon?.Icon ?? Stamp
                return <StampIcon className="w-5 h-5" style={{ color: brandColor }} strokeWidth={2} />
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* Reward */}
      <div className="px-6 pb-4">
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <p className="text-white/60 text-xs mb-0.5">Premio</p>
          <p className="font-semibold text-white">{reward}</p>
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
        style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
      >
        {expirationDate && <span className="text-white/60">Vence: {expirationDate}</span>}
        <span className="text-white/60 ml-auto">Con tecnología de Koda</span>
      </div>
    </div>
  )
}
