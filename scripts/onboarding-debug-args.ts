export const debugCommands = ["status", "enable", "reset"] as const
export type DebugCommand = (typeof debugCommands)[number]

export function parseDebugArgs(argv: readonly string[]) {
  const args = argv.filter((arg) => arg !== "--")
  const action = args[0]
  const email = args[1]
  if (!email || !email.toLowerCase().endsWith("@invalid.dev")) {
    throw new Error("Only @invalid.dev test accounts are supported")
  }
  if (!debugCommands.includes(action as DebugCommand)) {
    throw new Error("Usage: pnpm onboarding:debug -- <status|enable|reset> <email>")
  }
  return { command: action as DebugCommand, email }
}
