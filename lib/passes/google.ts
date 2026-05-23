import jwt from "jsonwebtoken"
import path from "node:path"
import fs from "node:fs/promises"
import { prisma } from "@/lib/prisma"

const DEV_MODE = process.env.GOOGLE_WALLET_DEV_MODE === "true"
const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ""
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || ""
const SERVICE_ACCOUNT_KEY_FILE = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_FILE || ""
const ORIGINS = (process.env.GOOGLE_WALLET_ORIGINS || "http://localhost:3000,https://localhost:3000")
  .split(",")
  .map((s) => s.trim())

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
  if (DEV_MODE) {
    return "dev-secret"
  }

  if (!SERVICE_ACCOUNT_KEY_FILE) {
    throw new Error(
      "GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_FILE not configured. " +
        "Download your service account JSON key and set this env var.",
    )
  }

  const keyPath = path.resolve(process.cwd(), SERVICE_ACCOUNT_KEY_FILE)
  const keyRaw = await fs.readFile(keyPath, "utf-8")
  return JSON.parse(keyRaw).private_key
}

function getConfigIssue(): string | null {
  if (DEV_MODE) return null
  if (!ISSUER_ID) return "GOOGLE_WALLET_ISSUER_ID no está configurado"
  if (!SERVICE_ACCOUNT_EMAIL) return "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL no está configurado"
  if (!SERVICE_ACCOUNT_KEY_FILE) return "GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_FILE no está configurado"
  return null
}

export function isConfigured(): boolean {
  return DEV_MODE || (!!ISSUER_ID && !!SERVICE_ACCOUNT_EMAIL && !!SERVICE_ACCOUNT_KEY_FILE)
}

export function getConfigError(): string | null {
  return getConfigIssue()
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
  } = params

  const stampsRemaining = Math.max(0, stampsRequired - stamps)

  const loyaltyClass = {
    id: classId(cardId),
    issuerName: businessName,
    programName: cardName,
    reviewStatus: "underReview",
    hexBackgroundColor: brandColor,
    localizedIssuerName: {
      defaultValue: {
        language: "es-MX",
        value: businessName,
      },
    },
    messages: [],
    locations: [],
  }

  const loyaltyObject = {
    id: objectId(cardId, customerId),
    classId: classId(cardId),
    state: "active",
    accountId: customerId,
    accountName: customerName,
    loyaltyPoints: {
      balance: {
        int: stamps,
      },
      label: "Sellos",
    },
    barcode: {
      type: "qrCode",
      value: customerId,
    },
    textModulesData: [
      {
        id: "reward",
        header: "Premio",
        body: reward,
      },
      {
        id: "stamps_remaining",
        header: "Sellos restantes",
        body: `${stampsRemaining}`,
      },
    ],
  }

  const signingKey = await getSigningKey()
  const now = Math.floor(Date.now() / 1000)

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
      origins: ORIGINS,
    },
    signingKey,
    { algorithm: DEV_MODE ? "HS256" : "RS256" },
  )

  return token
}

export function getSaveUrl(jwtToken: string): string {
  return `https://pay.google.com/gp/v/save/${jwtToken}`
}

export async function generateLoyaltyPassJwtFromCustomer(customerId: string): Promise<string> {
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
  })
}
