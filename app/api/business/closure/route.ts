/**
 * @openapi
 * /api/business/closure:
 *   get:
 *     tags: [Account]
 *     summary: Preview business account closure
 *     responses: { 200: { description: Closure preview } }
 *   post:
 *     tags: [Account]
 *     summary: Schedule or cancel business account closure
 *     responses: { 201: { description: Closure scheduled } }
 *   delete:
 *     tags: [Account]
 *     summary: Cancel business account closure
 *     responses: { 200: { description: Closure canceled } }
 */
export { GET, POST } from "@/app/api/account/closure/route"

export { DELETE } from "@/app/api/business/closure/delete-route"
