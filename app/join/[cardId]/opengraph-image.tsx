import { ImageResponse } from "next/og"
import { siteConfig } from "@/lib/site-config"
import { prisma } from "@/lib/prisma"

const ICON_EMOJI: Record<string, string> = {
  coffee: "☕",
  utensils: "🍽️",
  "shopping-bag": "🛍️",
  star: "⭐",
  crown: "👑",
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount)
  const b = Math.max(0, (num & 0x0000ff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

function isLight(hex: string): boolean {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = num >> 16
  const g = (num >> 8) & 0x00ff
  const b = num & 0x0000ff
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

export default async function Image({
  params,
}: {
  params: Promise<{ cardId: string }>
}) {
  const { cardId } = await params

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      name: true,
      reward: true,
      stampsRequired: true,
      brandColor: true,
      expiresAt: true,
      business: {
        select: { name: true, logoUrl: true, iconName: true },
      },
    },
  })

  const fallback = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f97316",
        backgroundImage: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
        fontFamily: "system-ui, sans-serif",
        color: "white",
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 800, marginBottom: 12 }}>{siteConfig.name}</div>
      <div style={{ fontSize: 28, opacity: 0.85 }}>Tarjetas de Lealtad Digital</div>
    </div>
  )

  if (!card) return new ImageResponse(fallback, { width: 1200, height: 630 })

  const bg = card.brandColor || siteConfig.defaultBrandColor
  const bg2 = darken(bg, 50)
  const light = isLight(bg)
  const text = light ? "#111827" : "#ffffff"
  const textMuted = light ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)"
  const pillBg = light ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.18)"
  const pillBorder = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"
  const hasExpiry = !!card.expiresAt

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: bg,
        backgroundImage: `linear-gradient(145deg, ${bg} 0%, ${bg2} 100%)`,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: "absolute", top: -160, right: -160, width: 480, height: 480,
        borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex",
      }} />
      <div style={{
        position: "absolute", bottom: -120, left: -80, width: 360, height: 360,
        borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex",
      }} />

      {/* Limited time badge — top right */}
      {hasExpiry && (
        <div style={{
          position: "absolute", top: 36, right: 52,
          display: "flex", alignItems: "center", gap: 8,
          background: light ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)",
          border: `1.5px solid ${light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.3)"}`,
          borderRadius: 999, padding: "10px 22px",
          fontSize: 18, fontWeight: 700, color: text,
          letterSpacing: "0.01em",
        }}>
          <span>⚡</span>
          <span>Por tiempo limitado</span>
        </div>
      )}

      {/* Main content */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "row",
        alignItems: "center", padding: "0 80px", gap: 64,
      }}>
        {/* Left: logo + business */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-start",
          gap: 20, flex: "0 0 auto", maxWidth: 420,
        }}>
          {/* Logo, emoji icon, or initial */}
          {card.business.logoUrl ? (
            <div style={{
              width: 120, height: 120, borderRadius: 28,
              background: light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.20)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              <img
                src={card.business.logoUrl}
                width={96}
                height={96}
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : (
            <div style={{
              width: 120, height: 120, borderRadius: 28,
              background: light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.20)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: card.business.iconName ? 64 : 60,
              fontWeight: 800, color: text,
            }}>
              {card.business.iconName
                ? (ICON_EMOJI[card.business.iconName] ?? card.business.name.charAt(0).toUpperCase())
                : card.business.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: text, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              {card.business.name}
            </div>
            <div style={{ fontSize: 24, color: textMuted, fontWeight: 500 }}>
              {card.name}
            </div>
          </div>

          {/* Reward pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: pillBg, border: `1px solid ${pillBorder}`,
            borderRadius: 999, padding: "10px 24px",
            fontSize: 20, color: text,
          }}>
            <span style={{ opacity: 0.75 }}>{`${card.stampsRequired} sellos`}</span>
            <span style={{ opacity: 0.5, margin: "0 4px" }}>→</span>
            <span style={{ fontWeight: 700 }}>{card.reward}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: 1, alignSelf: "stretch", margin: "80px 0",
          background: light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)",
          display: "flex",
        }} />

        {/* Right: CTA */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-start",
          gap: 16, flex: 1,
        }}>
          <div style={{
            fontSize: 16, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: textMuted,
          }}>
            Programa de Lealtad
          </div>
          <div style={{
            display: "flex", flexDirection: "column",
            fontSize: 56, fontWeight: 800, color: text, lineHeight: 1.1,
            letterSpacing: "-0.02em", gap: 0,
          }}>
            <span>Obtén tu</span>
            <span>Fidelity Card</span>
          </div>
          <div style={{
            display: "flex", flexDirection: "column",
            fontSize: 22, color: textMuted, lineHeight: 1.4, marginTop: 4, gap: 0,
          }}>
            <span>Acumula sellos con cada visita</span>
            <span>y gana recompensas exclusivas.</span>
          </div>

          {/* Stamp dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {Array.from({ length: Math.min(card.stampsRequired, 10) }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: i < Math.ceil(card.stampsRequired * 0.4)
                    ? (light ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.85)")
                    : (light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"),
                  border: `2px solid ${light ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.3)"}`,
                }}
              />
            ))}
            {card.stampsRequired > 10 && (
              <div style={{ fontSize: 18, color: textMuted, alignSelf: "center", display: "flex" }}>
                {`+${card.stampsRequired - 10}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 80px 32px",
      }}>
        <div style={{ fontSize: 14, color: textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {siteConfig.url.replace("https://", "")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src={`${siteConfig.url}/short-logo.svg`}
            width={22}
            height={22}
            style={{ borderRadius: 5, opacity: 0.6 }}
          />
          <span style={{ fontSize: 14, color: textMuted, fontWeight: 600 }}>{siteConfig.shortName}</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
