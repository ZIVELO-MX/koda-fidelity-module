import { ImageResponse } from "next/og"
import { siteConfig } from "@/lib/site-config"

export const runtime = "edge"

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount)
  const b = Math.max(0, (num & 0x0000ff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount)
  const b = Math.min(255, (num & 0x0000ff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

function isLight(hex: string): boolean {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = num >> 16
  const g = (num >> 8) & 0x00ff
  const b = num & 0x0000ff
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

type CardQueryResult = {
  id: string
  name: string
  reward: string
  stampsRequired: number
  brandColor: string | null
  business: { name: string }
}

export default async function Image({
  params,
}: {
  params: Promise<{ cardId: string }>
}) {
  const { cardId } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const res = await fetch(
    `${supabaseUrl}/rest/v1/loyalty_card?select=*,business(name)&id=eq.${cardId}`,
    {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey!}`,
      },
    },
  )
  const rows: CardQueryResult[] = await res.json()
  const card = rows[0]

  if (!card) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "white",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, marginBottom: 16 }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 32, opacity: 0.9 }}>
          Tarjeta de Lealtad Digital
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    )
  }

  const bgColor = card.brandColor || siteConfig.defaultBrandColor
  const textColor = isLight(bgColor) ? "#1a1a1a" : "#ffffff"

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${bgColor} 0%, ${darken(bgColor, 40)} 50%, ${darken(bgColor, 70)} 100%)`,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: textColor,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
          padding: "0 80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {card.business.name}
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            opacity: 0.85,
            marginBottom: 24,
          }}
        >
          {card.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 24,
            opacity: 0.75,
            padding: "12px 32px",
            borderRadius: 999,
            background: isLight(bgColor)
              ? "rgba(0,0,0,0.08)"
              : "rgba(255,255,255,0.12)",
            border: `1px solid ${
              isLight(bgColor)
                ? "rgba(0,0,0,0.1)"
                : "rgba(255,255,255,0.15)"
            }`,
          }}
        >
          <span>{card.stampsRequired} sellos</span>
          <span style={{ margin: "0 8px" }}>→</span>
          <span style={{ fontWeight: 700 }}>{card.reward}</span>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 18,
            opacity: 0.6,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {siteConfig.name} · Tarjeta de Lealtad Digital
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 32,
          right: 40,
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: 0.5,
          fontSize: 16,
        }}
      >
        <img
          src={`${siteConfig.url}/short-logo.svg`}
          alt={siteConfig.shortName}
          width={28}
          height={28}
          style={{ borderRadius: 6 }}
        />
        <span>{siteConfig.shortName}</span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  )
}
