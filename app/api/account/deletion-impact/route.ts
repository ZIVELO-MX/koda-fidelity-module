import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBusinessFromSession, handleApiError } from "@/lib/api-utils"
import { previewClosure } from "@/lib/account-lifecycle"

export async function GET() {
  try {
    const { business } = await getBusinessFromSession()
    const impact = await previewClosure(prisma, business.id)
    return NextResponse.json({ ...impact, irreversible: true, gracePeriodDays: 30 })
  } catch (error) { return handleApiError(error) }
}
