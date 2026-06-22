import { PKPass } from "passkit-generator"
import { promises as fs } from "node:fs"
import path from "node:path"
import sharp from "sharp"
import { prisma } from "@/lib/prisma"

const DEV_MODE = process.env.APPLE_WALLET_DEV_MODE === "true"
const PASS_TYPE_IDENTIFIER = process.env.APPLE_PASS_TYPE_IDENTIFIER || "pass.com.koda.fidelity"
const TEAM_IDENTIFIER = process.env.APPLE_TEAM_IDENTIFIER || ""
const CERT_PASSWORD = process.env.APPLE_PASS_CERT_PASSWORD || ""

const CERTS_DIR = path.join(process.cwd(), "certificates")

function loadCert(name: string): string {
  return path.join(CERTS_DIR, name)
}

function getAuthToken(): string {
  return process.env.APPLE_PASS_AUTH_TOKEN || ""
}

function getWebServiceURL(): string {
  return process.env.APPLE_PASS_WEBSERVICE_URL || ""
}

async function svgToPng(svgPath: string, width: number, height: number): Promise<Buffer | null> {
  try {
    const svg = await fs.readFile(svgPath)
    return await sharp(svg).resize(width, height).png().toBuffer()
  } catch {
    return null
  }
}

async function loadImages(): Promise<Record<string, Buffer>> {
  const PUBLIC_DIR = path.join(process.cwd(), "public")
  const PASSES_DIR = path.join(PUBLIC_DIR, "passes")

  const readImage = async (name: string): Promise<Buffer | null> => {
    try {
      const buf = await fs.readFile(path.join(PASSES_DIR, name))
      return buf as Buffer
    } catch {
      return null
    }
  }

  let icon: Buffer | null = await readImage("icon.png")
  if (!icon) {
    icon = (await svgToPng(path.join(PUBLIC_DIR, "icon.svg"), 58, 58)) as Buffer
  }

  let logo: Buffer | null = await readImage("logo.png")
  if (!logo) {
    logo = (await svgToPng(path.join(PUBLIC_DIR, "icon.svg"), 320, 320)) as Buffer
  }

  const strip = await readImage("strip.png")
  const footer = await readImage("footer.png")
  const background = await readImage("background.png")

  let thumbnail = await readImage("thumbnail.png")
  if (!thumbnail && icon) {
    thumbnail = icon
  }

  const images: Record<string, Buffer> = {}

  if (icon) images["icon.png"] = icon
  if (icon) images["icon@2x.png"] = icon
  if (logo) images["logo.png"] = logo
  if (logo) images["logo@2x.png"] = logo
  if (strip) images["strip.png"] = strip
  if (strip) images["strip@2x.png"] = strip
  if (footer) images["footer.png"] = footer
  if (footer) images["footer@2x.png"] = footer
  if (background) images["background.png"] = background
  if (background) images["background@2x.png"] = background
  if (thumbnail) images["thumbnail.png"] = thumbnail
  if (thumbnail) images["thumbnail@2x.png"] = thumbnail

  return images
}

async function loadCertificates() {
  if (DEV_MODE) return undefined

  return {
    wwdr: loadCert("wwdr.pem"),
    signerCert: loadCert("signerCert.pem"),
    signerKey: loadCert("signerKey.pem"),
    signerKeyPassphrase: CERT_PASSWORD || undefined,
  }
}

export async function generateLoyaltyPass(customerId: string): Promise<Buffer> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { card: { include: { business: true } } },
  })

  if (!customer) throw new Error("Customer not found")

  const { card } = customer
  const stampsUsed = customer.stamps
  const stampsTotal = card.stampsRequired
  const stampsRemaining = Math.max(0, stampsTotal - stampsUsed)

  const images = await loadImages()
  const certificates = await loadCertificates()

  const pass = new PKPass(
    images,
    certificates,
    {
      description: `${card.name} — ${card.business.name}`,
      organizationName: card.business.name,
      passTypeIdentifier: PASS_TYPE_IDENTIFIER,
      teamIdentifier: TEAM_IDENTIFIER,
      serialNumber: customer.id,
      logoText: card.name,
      backgroundColor: card.brandColor || "#ff6b35",
      foregroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(255, 255, 255)",
      authenticationToken: getAuthToken(),
      webServiceURL: getWebServiceURL(),
    },
  )

  pass.type = "storeCard"

  pass.primaryFields.push({
    key: "customer",
    label: "Cliente",
    value: customer.name,
  })

  pass.secondaryFields.push({
    key: "stamps",
    label: "Sellos",
    value: `${stampsUsed}/${stampsTotal}`,
  })

  pass.auxiliaryFields.push({
    key: "reward",
    label: "Premio",
    value: card.reward,
  })

  pass.backFields.push(
    {
      key: "business",
      label: "Negocio",
      value: card.business.name,
    },
    {
      key: "stamps_remaining",
      label: "Sellos restantes",
      value: `${stampsRemaining}`,
    },
    {
      key: "description",
      label: "Descripción",
      value: card.description || "",
    },
  )

  if (card.expiresAt) {
    pass.backFields.push({
      key: "expires",
      label: "Vence",
      value: card.expiresAt.toLocaleDateString("es-MX"),
    })
  }

  return pass.getAsBuffer()
}

export async function updateLoyaltyPass(customerId: string): Promise<Buffer> {
  return generateLoyaltyPass(customerId)
}
