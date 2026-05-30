import jwt from "jsonwebtoken"
import path from "node:path"
import fs from "node:fs/promises"
import { prisma } from "@/lib/prisma"
import { getPublicUrl } from "@/lib/supabase-storage"

const DEV_MODE = process.env.GOOGLE_WALLET_DEV_MODE === "true"
const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ""
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || ""
const SERVICE_ACCOUNT_KEY_FILE = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_FILE || ""
const SERVICE_ACCOUNT_KEY_JSON = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON || ""
const ENV_ORIGINS = process.env.GOOGLE_WALLET_ORIGINS

function classId(cardId: string): string {
  return `${ISSUER_ID}.koda_loyalty_${cardId}`
}

function objectId(cardId: string, customerId: string): string {
  return `${ISSUER_ID}.koda_loyalty_${cardId}_${customerId}`
}

function getIssuer(): string {
  if (DEV_MODE) return "dev@koda-fidelity.iam.gserviceaccount.com"
  return SERVICE_ACCOUNT_EMAIL
}

async function getSigningKey(): Promise<string> {
  if (DEV_MODE) return "dev-secret"
  if (SERVICE_ACCOUNT_KEY_JSON) {
    return JSON.parse(SERVICE_ACCOUNT_KEY_JSON).private_key
  }
  if (!SERVICE_ACCOUNT_KEY_FILE) {
    throw new Error(
      "Set GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON (preferred) or GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_FILE.",
    )
  }
  const keyPath = path.resolve(process.cwd(), SERVICE_ACCOUNT_KEY_FILE)
  const certsDir = path.resolve(process.cwd(), "certificates")
  if (!keyPath.startsWith(certsDir + path.sep)) {
    throw new Error("GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_FILE must be inside the certificates/ directory.")
  }
  const keyRaw = await fs.readFile(keyPath, "utf-8")
  return JSON.parse(keyRaw).private_key
}

function getConfigIssue(): string | null {
  if (DEV_MODE) return null
  if (!ISSUER_ID) return "GOOGLE_WALLET_ISSUER_ID is not configured"
  if (!SERVICE_ACCOUNT_EMAIL) return "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL is not configured"
  if (!SERVICE_ACCOUNT_KEY_JSON && !SERVICE_ACCOUNT_KEY_FILE)
    return "GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON (or KEY_FILE) is not configured"
  return null
}

export function isConfigured(): boolean {
  const hasKey = !!SERVICE_ACCOUNT_KEY_JSON || !!SERVICE_ACCOUNT_KEY_FILE
  return DEV_MODE || (!!ISSUER_ID && !!SERVICE_ACCOUNT_EMAIL && hasKey)
}

export function getConfigError(): string | null {
  return getConfigIssue()
}

function heroImageName(brandColor: string): string {
  const color = brandColor.toLowerCase()
  if (color.includes("f97316") || color.includes("ff6b35") || color.includes("orange")) return "hero-orange.png"
  if (color.includes("3b82f6") || color.includes("blue")) return "hero-blue.png"
  return "hero-orange.png"
}

interface GeneratePassJwtParams {
  customerId: string
  cardId: string
  customerName: string
  businessName: string
  cardName: string
  reward: string
  stamps: number
  stampsRequired: number
  brandColor: string
  baseUrl: string
}

export async function generateLoyaltyPassJwt(params: GeneratePassJwtParams): Promise<string> {
  const {
    customerId,
    cardId,
    customerName,
    businessName,
    cardName,
    reward,
    stamps,
    stampsRequired,
    brandColor,
    baseUrl,
  } = params

  const stampsRemaining = Math.max(0, stampsRequired - stamps)
  const progress = Math.round((stamps / stampsRequired) * 100)

  const loyaltyClass: Record<string, unknown> = {
    id: classId(cardId),
    issuerName: businessName,
    programName: cardName,
    reviewStatus: "underReview",
    hexBackgroundColor: brandColor,
    hexFontColor: "#ffffff",
    localizedIssuerName: {
      defaultValue: { language: "es-MX", value: businessName },
    },
    messages: [],
    locations: [],
  }

  loyaltyClass.logo = {
    sourceUri: { uri: getPublicUrl("google-logo.png") },
    contentDescription: { defaultValue: { language: "es-MX", value: businessName } },
  }
  loyaltyClass.cardTitleImage = {
    sourceUri: { uri: getPublicUrl("google-logo.png") },
    contentDescription: { defaultValue: { language: "es-MX", value: cardName } },
  }

  const loyaltyObject: Record<string, unknown> = {
    id: objectId(cardId, customerId),
    classId: classId(cardId),
    state: "active",
    accountId: customerId,
    accountName: customerName,
    loyaltyPoints: {
      balance: { int: stamps },
      label: "Sellos obtenidos",
    },
    secondaryLoyaltyPoints: {
      balance: { int: stampsRemaining },
      label: "Sellos restantes",
    },
    barcode: {
      type: "qrCode",
      value: customerId,
      alternateText: "Muestra este código al canjear",
    },
    textModulesData: [
      {
        id: "progress",
        header: "Progreso",
        body: `${stamps}/${stampsRequired} sellos — ${progress}%`,
      },
      {
        id: "reward",
        header: "Premio",
        body: reward,
      },
    ],
    linksModuleData: {
      uris: [
        {
          uri: `${baseUrl}/join/${cardId}`,
          description: "Ver detalles del programa",
        },
      ],
    },
  }

  loyaltyObject.heroImage = {
    sourceUri: { uri: getPublicUrl(heroImageName(brandColor)) },
    contentDescription: { defaultValue: { language: "es-MX", value: businessName } },
  }

  const signingKey = await getSigningKey()
  const now = Math.floor(Date.now() / 1000)

  const origins = ENV_ORIGINS
    ? ENV_ORIGINS.split(",").map((s) => s.trim())
    : [baseUrl.replace(/\/$/, "")]

  const token = jwt.sign(
    {
      iss: getIssuer(),
      aud: "google",
      typ: "savetowallet",
      iat: now,
      payload: {
        loyaltyClasses: [loyaltyClass],
        loyaltyObjects: [loyaltyObject],
      },
      origins,
    },
    signingKey,
    { algorithm: DEV_MODE ? "HS256" : "RS256" },
  )

  return token
}

export function getSaveUrl(jwtToken: string): string {
  return `https://pay.google.com/gp/v/save/${jwtToken}`
}

export async function generateLoyaltyPassJwtFromCustomer(customerId: string, baseUrl: string): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { card: { include: { business: true } } },
  })

  if (!customer) throw new Error("Customer not found")

  return generateLoyaltyPassJwt({
    customerId: customer.id,
    cardId: customer.card.id,
    customerName: customer.name,
    businessName: customer.card.business.name,
    cardName: customer.card.name,
    reward: customer.card.reward,
    stamps: customer.stamps,
    stampsRequired: customer.card.stampsRequired,
    brandColor: customer.card.brandColor || customer.card.business.brandColor,
    baseUrl,
  })
}
