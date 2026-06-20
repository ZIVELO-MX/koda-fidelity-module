"use client"

import { QRCodeSVG } from "qrcode.react"
import { Stamp } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCardIcon } from "@/lib/card-icons"
import { isLight, cardTextColor } from "@/lib/color-utils"

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

  const light = isLight(brandColor)
  const fg = light ? "#1a1a1a" : "#ffffff"
  const fgMuted = light ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)"
  const fgMuted2 = light ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.7)"
  const overlay = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"
  const overlayIcon = light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.2)"
  const stampBg = light ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.95)"
  const stampBorder = light ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)"
  const footerBg = light ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.1)"

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
          <p className="text-sm font-medium" style={{ color: light ? "rgba(0,0,0,0.8)" : fg }}>Tu Progreso</p>
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
                    ? { background: "linear-gradient(135deg, #9333ea, #ec4899)" }
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
                    return <MilestoneIconComp className="w-5 h-5 text-white" strokeWidth={2} />
                  }
                  const effectiveStampIcon = stampIconName ?? iconName
                  if (effectiveStampIcon === "logo" && businessLogo) {
                    return <img src={businessLogo} alt="" className="w-5 h-5 object-contain rounded" />
                  }
                  const cardIcon = getCardIcon(effectiveStampIcon)
                  const StampIcon = cardIcon?.Icon ?? Stamp
                  return <StampIcon className="w-5 h-5" style={{ color: light ? "#1a1a1a" : brandColor }} strokeWidth={2} />
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
              fgColor={light ? "#1a1a1a" : brandColor}
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
