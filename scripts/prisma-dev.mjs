import dotenv from "dotenv"
import { spawn } from "node:child_process"
import { resolve } from "node:path"

const isProduction = process.env.NODE_ENV === "production"

if (!isProduction) {
  dotenv.config({ path: resolve(process.cwd(), ".env.development.local"), override: true })
}

const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js")
const child = spawn(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
})

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
