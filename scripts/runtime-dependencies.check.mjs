import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"

const root = new URL("../package.json", import.meta.url)
const { dependencies } = JSON.parse(readFileSync(root, "utf8"))
const require = createRequire(root)

for (const name of ["@prisma/client", "sonner", "zod"]) {
  test(`${name} is available to a production-only install`, () => {
    assert.ok(dependencies?.[name], `${name} must be declared in dependencies`)
    assert.doesNotThrow(() => require.resolve(name))
  })
}
