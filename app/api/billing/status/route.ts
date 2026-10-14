/**
 * @openapi
 * /api/billing/status:
 *   get:
 *     tags: [Billing]
 *     summary: Read current billing status
 *     responses: { 200: { description: Billing entitlements } }
 */
export { GET } from "@/app/api/subscription/route"
