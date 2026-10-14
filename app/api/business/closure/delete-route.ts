import { NextRequest } from "next/server"
import { POST } from "@/app/api/account/closure/route"

export async function DELETE(request: NextRequest) {
  return POST(new NextRequest(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({ action: "cancel" }) }))
}
