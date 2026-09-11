/**
 * @openapi
 * /api/customer/profile:
 *   get:
 *     tags: [Customer]
 *     summary: Read customer profile
 *     responses: { 200: { description: Customer profile } }
 *   put:
 *     tags: [Customer]
 *     summary: Create customer profile
 *     responses: { 200: { description: Customer profile } }
 *   patch:
 *     tags: [Customer]
 *     summary: Update customer profile
 *     responses: { 200: { description: Customer profile } }
 */
export { GET, PUT, PATCH } from "@/app/api/customer-profile/route"
