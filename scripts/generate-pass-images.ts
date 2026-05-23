import sharp from "sharp"
import path from "node:path"
import fs from "node:fs/promises"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PASSES_DIR = path.join(__dirname, "..", "public", "passes")
const ICON_SVG = path.join(__dirname, "..", "public", "icon.svg")

async function main() {
  await fs.mkdir(PASSES_DIR, { recursive: true })

  const svgBuffer = await fs.readFile(ICON_SVG)

  // icon.png: 58x58px (@2x for 29pt icon)
  await sharp(svgBuffer).resize(58, 58).png().toFile(path.join(PASSES_DIR, "icon.png"))

  // logo.png: 320x100px (@2x for max ~160x50pt logo area)
  await sharp(svgBuffer).resize(320, 320).png().toFile(path.join(PASSES_DIR, "logo.png"))

  // Google Wallet hero image: 1200x300px (recommended aspect ratio 4:1)
  const heroOrange = await heroImage("#f97316", svgBuffer)
  await heroOrange.png().toFile(path.join(PASSES_DIR, "hero-orange.png"))

  const heroBlue = await heroImage("#3b82f6", svgBuffer)
  await heroBlue.png().toFile(path.join(PASSES_DIR, "hero-blue.png"))

  // Google Wallet logo: 400x400px
  await sharp(svgBuffer).resize(400, 400).png().toFile(path.join(PASSES_DIR, "google-logo.png"))

  console.log("Pass images generated in", PASSES_DIR)
}

async function heroImage(color: string, logo: Buffer): Promise<sharp.Sharp> {
  const hex = color.replace("#", "")
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)

  const logoResized = await sharp(logo).resize(200, 200).toBuffer()

  const overlay = await sharp({
    create: {
      width: 1200,
      height: 300,
      channels: 4,
      background: { r, g, b, alpha: 1 },
    },
  })
    .composite([
      {
        input: logoResized,
        top: 50,
        left: 500,
      },
      {
        input: Buffer.from(
          `<svg width="1200" height="300">
            <rect x="0" y="0" width="1200" height="300" fill="rgba(0,0,0,0.1)" rx="16"/>
          </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer()

  return sharp(overlay)

  console.log("Pass images generated in", PASSES_DIR)
}

main().catch(console.error)
