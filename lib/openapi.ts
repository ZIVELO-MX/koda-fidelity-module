import swaggerJsdoc from "swagger-jsdoc"

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Koda Fidelity API",
      version: "1.0.0",
      description:
        "API for the Koda POS loyalty module. Manages loyalty cards, customers, stamps, and digital passes for Apple Wallet and Google Wallet.",
      contact: {
        name: "Koda Fidelity",
        url: "https://fidelity.zivelo.dev",
        email: "contacto@zivelo.dev",
      },
    },
    servers: [
      {
        url: "https://fidelity.zivelo.dev",
        description: "Production",
      },
      {
        url: "http://localhost:3000",
        description: "Development",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "sb-auth-token",
          description:
            "Authentication through the Supabase session cookie for protected business routes.",
        },
      },
      schemas: {
        Business: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique business ID" },
            name: { type: "string", description: "Business name" },
            email: {
              type: "string",
              format: "email",
              description: "Business email linked to Supabase Auth",
            },
            brandColor: {
              type: "string",
              description: "Brand color in hexadecimal format",
              example: "#ff6b35",
            },
            logoUrl: {
              type: "string",
              nullable: true,
              description: "Logo URL",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        LoyaltyCard: {
          type: "object",
          properties: {
            id: { type: "string" },
            businessId: { type: "string" },
            name: { type: "string", description: "Card name" },
            description: {
              type: "string",
              nullable: true,
              description: "Description",
            },
            reward: { type: "string", description: "Reward on completion" },
            stampsRequired: {
              type: "integer",
              description: "Stamps required to redeem",
              example: 10,
            },
            brandColor: { type: "string", example: "#ff6b35" },
            expiresAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        LoyaltyCardWithStats: {
          type: "object",
          allOf: [
            { $ref: "#/components/schemas/LoyaltyCard" },
            {
              type: "object",
              properties: {
                customers: {
                  type: "integer",
                  description: "Customer count",
                },
                totalStamps: {
                  type: "integer",
                  description: "Total accumulated stamps",
                },
              },
            },
          ],
        },
        Customer: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", nullable: true },
            cardId: { type: "string" },
            stamps: { type: "integer" },
            applePassId: { type: "string", nullable: true },
            googlePassId: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            card: {
              $ref: "#/components/schemas/LoyaltyCard",
              description: "Associated card",
            },
          },
        },
        DashboardStats: {
          type: "object",
          properties: {
            activeCards: { type: "integer" },
            totalCustomers: { type: "integer" },
            stampsGiven: { type: "integer" },
            redemptions: { type: "integer" },
            recentActivity: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["stamp", "redeem"] },
                  customerName: { type: "string" },
                  cardName: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
            cards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  reward: { type: "string" },
                  stampsRequired: { type: "integer" },
                  brandColor: { type: "string" },
                  customers: { type: "integer" },
                  stampsGiven: { type: "integer" },
                },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", description: "Error message" },
          },
        },
      },
    },
  },
  apis: ["./app/api/**/route.ts"],
}

export function getOpenApiSpec(): Record<string, unknown> {
  return swaggerJsdoc(options) as Record<string, unknown>
}
