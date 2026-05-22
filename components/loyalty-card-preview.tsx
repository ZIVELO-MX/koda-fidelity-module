"use client"

import { QRCodeSVG } from "qrcode.react"
import { cn } from "@/lib/utils"

interface LoyaltyCardPreviewProps {
  businessName: string
  businessLogo?: string
  customerName?: string
  currentStamps: number
  maxStamps: number
  reward: string
  expirationDate?: string
  brandColor?: string
  className?: string
  showQR?: boolean
  qrValue?: string
}

export function LoyaltyCardPreview({
  businessName,
  businessLogo,
  customerName = "Your Name",
  currentStamps,
  maxStamps,
  reward,
  expirationDate,
  brandColor = "#f97316",
  className,
  showQR = true,
  qrValue = "https://koda.app/card/demo",
}: LoyaltyCardPreviewProps) {
  const stamps = Array.from({ length: maxStamps }, (_, i) => i < currentStamps)

  return (
    <div
      className={cn(
        "relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-xl",
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${brandColor}15 0%, white 50%, ${brandColor}08 100%)`,
      }}
    >
      {/* Card border */}
      <div className="absolute inset-0 rounded-3xl border-2 border-border/50" />
      
      {/* Top accent bar */}
      <div
        className="h-2"
        style={{ backgroundColor: brandColor }}
      />

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {businessLogo ? (
              <img
                src={businessLogo}
                alt={businessName}
                className="w-12 h-12 rounded-xl object-cover border border-border"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: brandColor }}
              >
                {businessName.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground text-lg">{businessName}</h3>
              <p className="text-xs text-muted-foreground">Loyalty Card</p>
            </div>
          </div>
        </div>

        {/* Customer name */}
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Member</p>
          <p className="font-medium text-foreground">{customerName}</p>
        </div>

        {/* Stamps grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Your Progress</p>
            <p className="text-sm text-muted-foreground">
              {currentStamps}/{maxStamps}
            </p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {stamps.map((filled, i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center transition-all",
                  filled
                    ? "shadow-sm"
                    : "border-2 border-dashed border-border bg-muted/30"
                )}
                style={filled ? { backgroundColor: brandColor } : {}}
              >
                {filled && (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reward */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: `${brandColor}15` }}
        >
          <p className="text-xs text-muted-foreground mb-1">Your Reward</p>
          <p className="font-semibold text-foreground">{reward}</p>
        </div>

        {/* QR Code */}
        {showQR && (
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-border">
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
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          {expirationDate && <span>Expires: {expirationDate}</span>}
          <span className="ml-auto">Powered by Koda</span>
        </div>
      </div>
    </div>
  )
}
