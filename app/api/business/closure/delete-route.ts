import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cancelClosure } from "@/lib/account-lifecycle"
import { getBusinessFromSession, handleApiError, requestIdFrom, withRequestId } from "@/lib/api-utils"

export async function DELETE(request: NextRequest) {
  const requestId = requestIdFrom(request)
  try {
    const { business } = await getBusinessFromSession()
    return withRequestId(NextResponse.json({ closure: await cancelClosure(prisma, business.id) }), requestId)
  } catch (error) { return withRequestId(handleApiError(error, requestId), requestId) }
}
