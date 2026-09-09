import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cancelClosure } from "@/lib/account-lifecycle"
import { getBusinessFromSession, handleApiError } from "@/lib/api-utils"

export async function DELETE() {
  try {
    const { business } = await getBusinessFromSession()
    return NextResponse.json({ closure: await cancelClosure(prisma, business.id) })
  } catch (error) { return handleApiError(error) }
}
