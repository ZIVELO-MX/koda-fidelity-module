import { PrismaClient } from "@prisma/client"
import { mockData } from "./mock-data"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  for (const biz of mockData.businesses) {
    await prisma.business.create({ data: biz })
    console.log(`  ✓ Business: ${biz.name}`)
  }

  for (const cust of mockData.customers) {
    await prisma.customer.create({ data: cust })
    console.log(`  ✓ Customer: ${cust.name} (${cust.stamps}/${cust.cardId})`)
  }

  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
