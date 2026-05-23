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

  // strip.png: 640x220px (@2x for 320x110pt strip area)
  await sharp({
    create: {
      width: 640,
      height: 220,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  }).png().toFile(path.join(PASSES_DIR, "strip.png"))

  // thumbnail.png: 180x180px (@2x for 90x90pt)
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(PASSES_DIR, "thumbnail.png"))

  // footer.png: 572x30px (@2x for 286x15pt)
  await sharp({
    create: {
      width: 572,
      height: 30,
      channels: 4,
      background: { r: 0, b: 0, g: 0, alpha: 0 },
    },
  }).png().toFile(path.join(PASSES_DIR, "footer.png"))

  // background.png: 640x480px (@2x)
  await sharp({
    create: {
      width: 640,
      height: 480,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  }).png().toFile(path.join(PASSES_DIR, "background.png"))

  console.log("Pass images generated in", PASSES_DIR)
}

main().catch(console.error)
