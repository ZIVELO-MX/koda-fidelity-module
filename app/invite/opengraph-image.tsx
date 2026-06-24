import { ImageResponse } from "next/og"
import { siteConfig } from "@/lib/site-config"

export const runtime = "edge"
export const alt = "Invitación a Koda Fidelity"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; name?: string }>
}) {
  const params = await searchParams
  const businessName = params.business ?? siteConfig.name
  const collaboratorName = params.name ?? null
  const accent = siteConfig.defaultBrandColor

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
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "0 80px",
          gap: 72,
        }}
      >
        {/* Left: invitation graphic */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 280,
            height: 280,
            borderRadius: 32,
            backgroundColor: `${accent}18`,
            border: `2px solid ${accent}30`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 96, display: "flex" }}>👋</div>
          <div
            style={{
              marginTop: 16,
              fontSize: 18,
              fontWeight: 700,
              color: accent,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Invitación
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            alignSelf: "stretch",
            margin: "80px 0",
            backgroundColor: "#e5e7eb",
            display: "flex",
          }}
        />

        {/* Right: text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: accent,
              display: "flex",
            }}
          >
            Koda Fidelity
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {collaboratorName && (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 500,
                  color: "#6b7280",
                  display: "flex",
                }}
              >
                Hola {collaboratorName},
              </div>
            )}
            <div
              style={{
                fontSize: collaboratorName ? 48 : 56,
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span>Te invitaron</span>
              <span>a unirte a</span>
            </div>
            <div
              style={{
                fontSize: collaboratorName ? 52 : 60,
                fontWeight: 800,
                color: accent,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                display: "flex",
                marginTop: 8,
              }}
            >
              {businessName}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
              backgroundColor: accent,
              borderRadius: 999,
              padding: "12px 28px",
              width: "fit-content",
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                display: "flex",
              }}
            >
              Acceder a mi cuenta →
            </span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px 28px",
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "#9ca3af",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {siteConfig.url.replace("https://", "")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600, display: "flex" }}>
            {siteConfig.shortName}
          </span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
