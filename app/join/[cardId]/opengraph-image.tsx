import { ImageResponse } from "next/og"
import { siteConfig } from "@/lib/site-config"
import { prisma } from "@/lib/prisma"

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
        select: { name: true },
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

  const accent = card.brandColor || siteConfig.defaultBrandColor
  const accentOnDark = isLight(accent) ? "#111827" : "#ffffff"
  const hasExpiry = !!card.expiresAt

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top accent bar */}
      <div style={{ display: "flex", height: 8, backgroundColor: accent }} />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "0 80px",
        gap: 72,
      }}>
        {/* Left: business identity */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 24,
          flex: "0 0 auto",
          width: 380,
        }}>
          {/* Business name + card name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              {card.business.name}
            </div>
            <div style={{ fontSize: 26, color: "#6b7280", fontWeight: 500 }}>
              {card.name}
            </div>
          </div>

          {/* Reward pill */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: `${accent}18`,
            border: `1.5px solid ${accent}40`,
            borderRadius: 999,
            padding: "10px 22px",
            fontSize: 22,
            color: accent,
            fontWeight: 600,
          }}>
            <span>{`${card.stampsRequired} sellos`}</span>
            <span style={{ opacity: 0.5, margin: "0 2px" }}>→</span>
            <span style={{ fontWeight: 700 }}>{card.reward}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: 1,
          alignSelf: "stretch",
          margin: "80px 0",
          backgroundColor: "#e5e7eb",
          display: "flex",
        }} />

        {/* Right: CTA */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 16,
          flex: 1,
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: accent,
          }}>
            Programa de Lealtad
          </div>

          <div style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 64,
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            gap: 0,
          }}>
            <span>Obtén tu</span>
            <span>Fidelity Card</span>
          </div>

          <div style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 24,
            color: "#6b7280",
            lineHeight: 1.5,
            marginTop: 4,
            gap: 0,
          }}>
            <span>Acumula sellos con cada visita</span>
            <span>y gana recompensas exclusivas.</span>
          </div>

          {/* Stamp dots */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {Array.from({ length: Math.min(card.stampsRequired, 10) }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: i < Math.ceil(card.stampsRequired * 0.4) ? accent : "#e5e7eb",
                  border: `2px solid ${i < Math.ceil(card.stampsRequired * 0.4) ? accent : "#d1d5db"}`,
                  display: "flex",
                }}
              />
            ))}
            {card.stampsRequired > 10 && (
              <div style={{ fontSize: 16, color: "#9ca3af", alignSelf: "center", display: "flex" }}>
                {`+${card.stampsRequired - 10}`}
              </div>
            )}
          </div>

          {/* Limited time badge */}
          {hasExpiry && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: accent,
              borderRadius: 999,
              padding: "8px 20px",
              marginTop: 4,
              fontSize: 16,
              fontWeight: 700,
              color: accentOnDark,
            }}>
              <span>⚡</span>
              <span>Por tiempo limitado</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 80px 28px",
      }}>
        <div style={{ fontSize: 13, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {siteConfig.url.replace("https://", "")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src={`${siteConfig.url}/short-logo.svg`}
            width={20}
            height={20}
            style={{ borderRadius: 4, opacity: 0.5 }}
          />
          <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>{siteConfig.shortName}</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
