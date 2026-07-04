import { getCardIcon } from "@/lib/card-icons"
import { cn } from "@/lib/utils"

interface CustomerCardListIconProps {
  iconName: string | null
  fallbackIconName: string | null
  businessLogo: string | null
  businessName: string
  brandColor: string
  className?: string
}

export function CustomerCardListIcon({
  iconName,
  fallbackIconName,
  businessLogo,
  businessName,
  brandColor,
  className,
}: CustomerCardListIconProps) {
  const effectiveIconName = iconName ?? fallbackIconName
  const icon = getCardIcon(effectiveIconName)
  const IconComp = icon?.Icon

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 overflow-hidden",
        className,
      )}
      style={{ backgroundColor: brandColor }}
    >
      {effectiveIconName === "logo" && businessLogo ? (
        <img src={businessLogo} alt="" className="w-full h-full object-contain" />
      ) : IconComp ? (
        <IconComp className="h-5 w-5" />
      ) : (
        businessName.charAt(0)
      )}
    </div>
  )
}
