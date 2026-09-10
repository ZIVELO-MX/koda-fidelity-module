import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { executeDueClosures } from "@/lib/account-lifecycle"

/** Authenticated scheduler entrypoint for the 30-day account closure worker. */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!expected || supplied !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const processed = await executeDueClosures(prisma)
  return NextResponse.json({ processed })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
