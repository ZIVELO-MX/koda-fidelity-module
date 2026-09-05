import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError, withRequestId } from "@/lib/api-utils"
import { activityQuerySchema } from "@/lib/dashboard-contracts"

/**
 * @openapi
 * /api/dashboard/activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Cursor-paginated activity
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: cursor, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       200: { description: Activity page }
 *       400: { description: Invalid cursor }
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const { business } = await getBusinessFromSession()
    const parsed = activityQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return withRequestId(NextResponse.json({ error: "Parámetros inválidos", code: "KF-REQUEST-001", action: "Corrige cursor o limit.", requestId, retryable: false }, { status: 400 }), requestId)
    const { cursor, limit } = parsed.data
    let cursorDate: Date | undefined
    let cursorId: string | undefined
    if (cursor) {
      try { const value = JSON.parse(Buffer.from(cursor, "base64url").toString()) as { createdAt: string; id: string }; cursorDate = new Date(value.createdAt); cursorId = value.id; if (Number.isNaN(cursorDate.getTime()) || !cursorId) throw new Error() } catch { return withRequestId(NextResponse.json({ error: "Cursor inválido", code: "KF-REQUEST-001", action: "Solicita la siguiente página desde el cursor recibido.", requestId, retryable: false }, { status: 400 }), requestId) }
    }
    const rows = await prisma.stampLog.findMany({ where: { businessId: business.id, customerId: { not: null }, ...(cursorDate && cursorId ? { OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: cursorId } }] } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1, include: { customer: { select: { name: true } }, card: { select: { name: true } } } })
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map((row) => ({ id: row.id, type: row.type, customerName: row.customer?.name ?? null, cardName: row.card?.name ?? null, createdAt: row.createdAt.toISOString() }))
    const last = items.at(-1)
    const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString("base64url") : null
    return withRequestId(NextResponse.json({ items, nextCursor }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
