# Plan 003: Add characterization tests for the real /api/stamps and /api/join route handlers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5970571..HEAD -- app/api/stamps/route.ts app/api/join/route.ts lib/__tests__/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (recommended after plans/001-ci-pipeline.md)
- **Category**: tests
- **Planned at**: commit `5970571`, 2026-06-11

## Why this matters

The stamp/redeem endpoint is this product's money path — it grants and consumes customer rewards — and the public join endpoint is its front door. Neither route handler has any test coverage. The existing `lib/__tests__/stamps.test.ts` **re-implements** the business logic as a local function inside the test file (`processStamp`, lines 16–48) and tests that copy; the real handler in `app/api/stamps/route.ts` (auth, tenant isolation, expiry, Prisma writes, error mapping) is exercised by nothing. Plans 004 (atomic stamp/redeem) and 005 (soft-delete filtering) modify these exact handlers; this plan must land first so those changes are made against a safety net that pins current behavior.

## Current state

- `app/api/stamps/route.ts` — POST handler. Full behavior at commit 5970571:

```ts
// app/api/stamps/route.ts:70-103 (abridged, structure exact)
export async function POST(request: NextRequest) {
  try {
    const { business } = await getBusinessFromSession()
    const body = await request.json()
    if (!body.customerId || typeof body.customerId !== "string") {
      throw new ValidationError("Customer ID is required")
    }
    const type = body.type === "redeem" ? "redeem" : "stamp"
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      include: { card: { select: { businessId: true, stampsRequired: true, reward: true, expiresAt: true } } },
    })
    if (!customer) throw new NotFoundError("Customer not found")
    if (customer.card.businessId !== business.id) throw new NotFoundError("Customer not found")
    if (isExpired(customer.card.expiresAt)) throw new ValidationError("This loyalty card has expired")
    if (type === "stamp") {
      if (customer.stamps >= customer.card.stampsRequired) {
        throw new ValidationError("Customer has completed the card and must redeem first.")
      }
      const updated = await prisma.customer.update({ /* increment + stampsLog create */ })
      return NextResponse.json({ customer: updated, event: "stamp", message: `...` })
    }
    if (type === "redeem") {
      if (customer.stamps < customer.card.stampsRequired) {
        throw new ValidationError(`Customer needs ${...} more stamps to redeem`)
      }
      const updated = await prisma.customer.update({ /* stamps: 0 + stampsLog create */ })
      return NextResponse.json({ customer: updated, event: "redeem", message: `...` })
    }
    throw new ValidationError("Invalid operation type")
  } catch (error) {
    return handleApiError(error)
  }
}
```

- `app/api/join/route.ts` — POST handler (public, no session):

```ts
// app/api/join/route.ts:139-182 (abridged, structure exact)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, cardId } = body
    if (!name || typeof name !== "string" || !name.trim()) throw new ValidationError("Name is required")
    if (!email || typeof email !== "string" || !email.includes("@")) throw new ValidationError("Invalid email")
    if (!cardId || typeof cardId !== "string") throw new ValidationError("Invalid card ID")
    const card = await prisma.loyaltyCard.findUnique({ where: { id: cardId } })
    if (!card) throw new NotFoundError("Loyalty card not found")
    if (isExpired(card.expiresAt)) throw new ValidationError("This loyalty card has expired")
    const existing = await prisma.customer.findFirst({ where: { email, cardId } })
    if (existing) return NextResponse.json({ existing: true })
    const customer = await prisma.customer.create({ data: { name: name.trim(), email, cardId } })
    return NextResponse.json({ customerId: customer.id, existing: false })
  } catch (error) {
    return handleApiError(error)
  }
}
```

- Error mapping (`lib/api-utils.ts:93-108`): `UnauthorizedError`→401, `ForbiddenError`→403, `NotFoundError`→404, `ValidationError`→400, anything else→500. `getBusinessFromSession()` (`lib/api-utils.ts:59-85`) calls `createClient()` from `@/lib/supabase-server`, then `prisma.user.findUnique({ where: { email }, include: { business: true } })`; throws `UnauthorizedError` if no auth user, `NotFoundError("User not found")` if no DB user.
- `isExpired` comes from `lib/card-utils.ts` and treats a past `expiresAt` Date as expired, `null` as not expired (it has its own tests in `lib/__tests__/card-utils.test.ts`).
- **Mocking convention to follow** — `lib/__tests__/api-utils.test.ts:1-10` is the exemplar:

```ts
import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/supabase-server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))
```

- Test runner: vitest 4, jsdom environment, setup file `lib/__tests__/setup.ts`, alias `@` → repo root (`vitest.config.mjs`). Tests live in `lib/__tests__/*.test.ts`. Current suite: 23 files, 238 tests, all green.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Run just the new tests | `pnpm exec vitest run lib/__tests__/stamps-route.test.ts lib/__tests__/join-route.test.ts` | all pass |
| Full suite | `pnpm test`             | all pass (238 + new) |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope** (the only files you should create — this plan modifies NO production code):
- `lib/__tests__/stamps-route.test.ts` (create)
- `lib/__tests__/join-route.test.ts` (create)

**Out of scope** (do NOT touch):
- `app/api/stamps/route.ts`, `app/api/join/route.ts` — these tests **characterize** current behavior; if a test won't pass without changing the route, your expectation is wrong, not the route (or you found drift → STOP).
- `lib/__tests__/stamps.test.ts` and `lib/__tests__/join.test.ts` — the existing (shallow) tests stay; do not delete or edit them.
- `lib/api-utils.ts`, `lib/card-utils.ts`.

## Git workflow

- Branch from `dev`: `test/api-route-handlers`
- Commit style: conventional commits, e.g. `test: add characterization tests for stamps and join route handlers`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Build the stamps route test harness

Create `lib/__tests__/stamps-route.test.ts`. Shape:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  customer: { findUnique: vi.fn(), update: vi.fn() },
}
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}))

import { POST } from "@/app/api/stamps/route"

function makeRequest(body: unknown) {
  return { json: async () => body } as never
}

const sessionUser = { email: "owner@biz.test" }
const dbUser = {
  id: "u1", email: "owner@biz.test", name: "Owner", role: "admin",
  business: { id: "biz1", name: "Biz", email: "owner@biz.test" },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: sessionUser }, error: null })
  mockPrisma.user.findUnique.mockResolvedValue(dbUser)
})
```

Notes that make this work:
- `getBusinessFromSession` only reads `business` and a few `user` fields off the Prisma result — the `dbUser` stub above is sufficient.
- The route's `NextRequest` is only used as a type; a stub object with `json()` is enough at runtime.
- `handleApiError` logs unknown errors with `console.error` — that's fine in tests.

**Verify**: `pnpm exec vitest run lib/__tests__/stamps-route.test.ts` runs (even with 1 placeholder test) → exit 0.

### Step 2: Write the stamps cases

Cases (each asserts HTTP status and, where noted, body fields):

1. **401 when unauthenticated**: `mockGetUser` resolves `{ data: { user: null }, error: null }` → status 401.
2. **400 when customerId missing**: body `{}` → 400, error "Customer ID is required".
3. **404 when customer not found**: `customer.findUnique` → null → 404.
4. **404 on cross-tenant access**: customer whose `card.businessId` is `"other-biz"` → 404 (this is the IDOR guard — assert it explicitly).
5. **400 when card expired**: `card.expiresAt` in the past (e.g. `new Date("2020-01-01")`) → 400, error contains "expired".
6. **stamp happy path**: customer `{ stamps: 3, card: { businessId: "biz1", stampsRequired: 10, reward: "Café", expiresAt: null } }`; `customer.update` resolves an updated customer → 200, body `event: "stamp"`; assert `customer.update` was called with `data` containing `stamps: { increment: 1 }` and a nested `stampsLog.create` of type `"stamp"`.
7. **400 stamping a full card**: `stamps: 10, stampsRequired: 10` → 400, error contains "must redeem"; assert `customer.update` NOT called.
8. **redeem happy path**: `stamps: 10, stampsRequired: 10`, body `{ customerId, type: "redeem" }` → 200, `event: "redeem"`; assert `update` called with `data.stamps: 0` and `stampsLog.create` type `"redeem"`.
9. **400 redeem with insufficient stamps**: `stamps: 3` → 400, error contains "more stamps"; `update` not called.
10. **unknown type defaults to stamp**: body `{ customerId, type: "banana" }` behaves as a stamp (the route maps anything ≠ "redeem" to "stamp" at line 80) — assert event is `"stamp"`.

**Verify**: `pnpm exec vitest run lib/__tests__/stamps-route.test.ts` → 10 tests pass.

### Step 3: Write the join cases

Create `lib/__tests__/join-route.test.ts` with the same harness pattern (mock `@/lib/prisma` with `loyaltyCard.findUnique`, `customer.findFirst`, `customer.create`; **no supabase mock needed** for POST — it is public; still mock `@/lib/supabase-server` defensively since the module imports it for GET).

Cases:
1. 400 when name missing/blank.
2. 400 when email lacks "@".
3. 400 when cardId missing.
4. 404 when card not found.
5. 400 when card expired (`expiresAt` in the past).
6. Returns `{ existing: true }` when a customer with same email+cardId exists; assert `customer.create` NOT called.
7. Happy path: creates customer with trimmed name and returns `{ customerId, existing: false }`; assert `create` called with `name` trimmed.

**Verify**: `pnpm exec vitest run lib/__tests__/join-route.test.ts` → 7 tests pass.

### Step 4: Full suite

**Verify**: `pnpm test` → all pass (238 pre-existing + 17 new). `npx tsc --noEmit` → exit 0. `pnpm lint` → exit 0.

## Test plan

This plan IS the test plan; the cases are enumerated in Steps 2–3. Structural pattern: `lib/__tests__/api-utils.test.ts` (module-level `vi.mock` before importing the unit under test).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `lib/__tests__/stamps-route.test.ts` exists with ≥ 10 tests covering all cases in Step 2, all passing
- [ ] `lib/__tests__/join-route.test.ts` exists with ≥ 7 tests covering all cases in Step 3, all passing
- [ ] `pnpm test` exits 0
- [ ] `npx tsc --noEmit` exits 0 and `pnpm lint` exits 0
- [ ] `git status` shows no modified files — only the two new test files (production code untouched)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The route handlers don't match the "Current state" excerpts (drift — especially if plans 004/005 already landed; in that case the expected behaviors for full-card stamping or inactive customers changed, and this plan needs refreshing, not improvising).
- A test can only pass by editing a file in the out-of-scope list.
- `vi.mock` of `next/server` breaks other imports in the route file (e.g. the route starts using `NextResponse` features beyond `.json`) — report the mismatch.
- Mocked-module hoisting issues persist after one fix attempt (remember: `vi.mock` calls are hoisted; mock objects referenced inside factories must be defined with `vi.hoisted` if you hit "Cannot access before initialization").

## Maintenance notes

- These are characterization tests: when plan 004 (atomic update with conditional `where`) lands, cases 6–9 must be updated to assert the new `update` call shape (the `where` clause gains a stamps condition, and full-card rejection surfaces via a caught P2025 instead of the pre-check — plan 004 describes the exact expected changes).
- When plan 005 lands, add an "inactive customer → 404" case to the stamps suite (plan 005 includes it).
- Reviewer should check the mocks assert *call shapes* (the `data`/`where` passed to Prisma), not just status codes — that's what protects the money path.
