import { isEmailConfirmationRequired } from "@/lib/config"

type CustomerSessionUser = { email?: string | null; email_confirmed_at?: string | null }

export function hasUsableCustomerEmail(
  user: CustomerSessionUser | null | undefined,
): user is CustomerSessionUser & { email: string } {
  return Boolean(user?.email && (!isEmailConfirmationRequired() || user.email_confirmed_at))
}
