import swaggerJsdoc from "swagger-jsdoc"

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Koda Fidelity API",
      version: "1.0.0",
      description:
        "API del módulo de fidelidad de Koda POS. Gestiona tarjetas de lealtad, clientes, sellos y pases digitales para Apple Wallet y Google Wallet.",
      contact: {
        name: "Koda Fidelity",
        url: "https://koda.app",
      },
    },
    servers: [
      {
        url: "https://koda-fidelity.vercel.app",
        description: "Producción",
      },
      {
        url: "http://localhost:3000",
        description: "Desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "sb-auth-token",
          description:
            "Autenticación mediante cookie de sesión de Supabase (para rutas protegidas del negocio).",
        },
      },
      schemas: {
        Business: {
          type: "object",
          properties: {
            id: { type: "string", description: "ID único del negocio" },
            name: { type: "string", description: "Nombre del negocio" },
            email: {
              type: "string",
              format: "email",
              description: "Email del negocio (vinculado a Supabase Auth)",
            },
            brandColor: {
              type: "string",
              description: "Color de marca en hex",
              example: "#ff6b35",
            },
            logoUrl: {
              type: "string",
              nullable: true,
              description: "URL del logo",
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
            name: { type: "string", description: "Nombre de la tarjeta" },
            description: {
              type: "string",
              nullable: true,
              description: "Descripción",
            },
            reward: { type: "string", description: "Recompensa al completar" },
            stampsRequired: {
              type: "integer",
              description: "Sellos requeridos para canjear",
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
                  description: "Cantidad de clientes",
                },
                totalStamps: {
                  type: "integer",
                  description: "Total de sellos acumulados",
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
              description: "Tarjeta asociada",
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
            error: { type: "string", description: "Mensaje de error" },
          },
        },
      },
    },
  },
  apis: ["./app/api/**/route.ts"],
}

export function getOpenApiSpec() {
  return swaggerJsdoc(options)
}
