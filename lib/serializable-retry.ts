import { Prisma } from "@prisma/client"

export async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
      if (!retryable || attempt === 6) throw error
      const delayMs = Math.min(1000, 25 * 2 ** attempt)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw new Error("Serializable transaction retry exhausted")
}
