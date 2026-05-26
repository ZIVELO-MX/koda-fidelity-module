import { describe, it, expect } from "vitest"
import { getOpenApiSpec } from "@/lib/openapi"

type OpenApiSpec = {
  openapi: string
  info: { title: string; version: string }
  paths: Record<string, Record<string, unknown>>
  components: {
    schemas: Record<string, unknown>
    securitySchemes: Record<string, { type: string; in: string }>
  }
  servers: Array<{ url: string }>
}

describe("OpenAPI spec", () => {
  const spec = getOpenApiSpec() as OpenApiSpec

  it("generates a valid OpenAPI 3.1 spec", () => {
    expect(spec.openapi).toBe("3.1.0")
    expect(spec.info.title).toBe("Koda Fidelity API")
    expect(spec.info.version).toBe("1.0.0")
  })

  it("documents all expected API paths", () => {
    const paths = Object.keys(spec.paths).sort()
    expect(paths).toEqual([
      "/api/business",
      "/api/cards",
      "/api/cards/{id}",
      "/api/customers",
      "/api/dashboard/stats",
      "/api/join",
      "/api/passes/apple/{cardId}",
      "/api/passes/google/{cardId}",
      "/api/stamps",
    ])
  })

  it("has correct HTTP methods for each path", () => {
    expect(spec.paths["/api/business"]).toHaveProperty("get")
    expect(spec.paths["/api/business"]).toHaveProperty("put")

    expect(spec.paths["/api/cards"]).toHaveProperty("get")
    expect(spec.paths["/api/cards"]).toHaveProperty("post")

    expect(spec.paths["/api/cards/{id}"]).toHaveProperty("get")
    expect(spec.paths["/api/cards/{id}"]).toHaveProperty("put")
    expect(spec.paths["/api/cards/{id}"]).toHaveProperty("delete")

    expect(spec.paths["/api/customers"]).toHaveProperty("get")
    expect(spec.paths["/api/dashboard/stats"]).toHaveProperty("get")
    expect(spec.paths["/api/join"]).toHaveProperty("get")
    expect(spec.paths["/api/join"]).toHaveProperty("post")
    expect(spec.paths["/api/stamps"]).toHaveProperty("post")
    expect(spec.paths["/api/passes/apple/{cardId}"]).toHaveProperty("post")
    expect(spec.paths["/api/passes/google/{cardId}"]).toHaveProperty("post")
  })

  it("has all required components schemas", () => {
    expect(spec.components.schemas).toHaveProperty("Business")
    expect(spec.components.schemas).toHaveProperty("LoyaltyCard")
    expect(spec.components.schemas).toHaveProperty("LoyaltyCardWithStats")
    expect(spec.components.schemas).toHaveProperty("Customer")
    expect(spec.components.schemas).toHaveProperty("DashboardStats")
    expect(spec.components.schemas).toHaveProperty("Error")
  })

  it("has security scheme for cookie auth", () => {
    expect(spec.components.securitySchemes).toHaveProperty("cookieAuth")
    expect(spec.components.securitySchemes.cookieAuth.type).toBe("apiKey")
    expect(spec.components.securitySchemes.cookieAuth.in).toBe("cookie")
  })

  it("defines production and development servers", () => {
    const urls = spec.servers.map((s: { url: string }) => s.url).sort()
    expect(urls).toContain("http://localhost:3000")
    expect(urls).toContain("https://koda-fidelity.vercel.app")
  })

  it("all paths have tags, summary and responses", () => {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [, operation] of Object.entries(methods as Record<string, unknown>)) {
        const op = operation as { tags?: string[]; summary?: string; responses?: Record<string, unknown> }
        expect(op.tags).toBeDefined()
        expect(op.tags!.length).toBeGreaterThan(0)
        expect(op.summary).toBeDefined()
        expect(op.responses).toBeDefined()
      }
    }
  })
})
