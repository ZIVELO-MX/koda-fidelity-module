import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { cuerpoJson, handleApiError, requestIdFrom, ValidationError, withRequestId } from "@/lib/api-utils"
import { issueManualPlanChangeNotice } from "@/lib/manual-plan-change-notice"

const noticeSchema = z.object({
  businessId: z.string().min(1),
  sourceEventId: z.string().min(1),
  previousPlan: z.enum(["LITE", "PRO"]),
  effectivePlan: z.enum(["LITE", "PRO"]),
  summary: z.string().trim().min(1).max(500),
})

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const expected = process.env.BILLING_INTERNAL_SECRET
    if (!expected || request.headers.get("x-billing-internal-secret") !== expected) throw new ValidationError("Operación interna requerida")
    const operator = request.headers.get("x-operator")?.trim()
    if (!operator) throw new ValidationError("Identifica a quien emite el aviso")
    const parsed = noticeSchema.safeParse(await cuerpoJson(request))
    if (!parsed.success) throw new ValidationError("Aviso de cambio de plan inválido")
    const event = await issueManualPlanChangeNotice(prisma, { ...parsed.data, operator })
    return withRequestId(NextResponse.json({ event }, { status: 201 }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
