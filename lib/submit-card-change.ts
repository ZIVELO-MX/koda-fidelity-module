export async function submitCardChange(url: string, init: RequestInit): Promise<Response | null> {
  const response = await fetch(url, init)
  if (response.status !== 409) return response

  const body = await response.clone().json().catch(() => null)
  if (body?.code !== "KF-CARD-CONFIRMATION" || typeof body.confirmation !== "string" || typeof body.error !== "string") return response
  if (!window.confirm(body.error)) return null

  const headers = new Headers(init.headers)
  headers.set("X-Confirm-Card-Change", body.confirmation)
  return fetch(url, { ...init, headers })
}
