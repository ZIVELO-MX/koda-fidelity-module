import { ImageResponse } from "next/og"
import { siteConfig } from "@/lib/site-config"

export const runtime = "edge"
export const alt = siteConfig.name
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@600;800&display=swap",
  ).then((res) => res.text())

  const urls = [...css.matchAll(/src: url\((.+?)\)/g)].map((m) => m[1])
  const weights = [...css.matchAll(/font-weight: (\d+)/g)].map((m) =>
    parseInt(m[1]),
  )

  const fonts = await Promise.all(
    urls.map(async (url, i) => {
      const data = await fetch(url).then((res) => res.arrayBuffer())
      return { name: "Inter", data, weight: weights[i] as 300 | 400 | 500 | 600 | 700 | 800, style: "normal" as const }
    }),
  )

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        color: "#1a1a1a",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "linear-gradient(90deg, #f97316, #ea580c)",
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
        <img
          src={`${siteConfig.url}/short-logo.svg`}
          alt={siteConfig.shortName}
          width={96}
          height={96}
          style={{ borderRadius: 20, marginBottom: 24 }}
        />
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "#f97316",
            marginBottom: 32,
          }}
        >
          {siteConfig.hero.tagline}
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#666",
            maxWidth: 600,
            lineHeight: 1.5,
          }}
        >
          {siteConfig.description}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  )
}
