/**
 * @openapi
 * /api/business/closure:
 *   get:
 *     tags: [Account]
 *     summary: Preview business account closure
 *     responses: { 200: { description: Closure preview } }
 *   post:
 *     tags: [Account]
 *     summary: Apply an internal business closure action
 *     responses: { 201: { description: Closure scheduled } }
 *   delete:
 *     tags: [Account]
 *     summary: Legacy cancellation route (use the internal POST action)
 *     responses: { 401: { description: Internal authorization required } }
 */
export { GET, POST } from "@/app/api/account/closure/route"

export { DELETE } from "@/app/api/business/closure/delete-route"
