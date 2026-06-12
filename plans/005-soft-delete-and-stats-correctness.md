# Plan 005: Enforce soft-delete filtering on customer reads/writes and fix the redemptions stat

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5970571..HEAD -- app/api/customers/route.ts app/api/stamps/route.ts app/api/dashboard/stats/route.ts lib/__tests__/`
> Plans 003/004 are EXPECTED to have touched `app/api/stamps/route.ts` and
> added `lib/__tests__/stamps-route.test.ts`. Anything else that differs from
> the "Current state" excerpts is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/003-route-handler-tests.md (recommended after plans/004-atomic-stamp-redeem.md to avoid merge conflicts in the same file)
- **Category**: bug
- **Planned at**: commit `5970571`, 2026-06-11

## Why this matters

The schema soft-deletes customers via `Customer.isActive` (`prisma/schema.prisma:70`, default `true`), and the dashboard customers page correctly filters `isActive: true`. But two server paths ignore the flag:

1. `GET /api/customers` (used by the scan page's customer search) returns soft-deleted customers, so an employee can find a "deleted" customer…
2. …and `POST /api/stamps` will happily stamp or redeem them, because it never checks `customer.isActive`.

Net effect: deleting a customer from the dashboard does not actually remove them from the operational flow — they resurface in scan searches and can keep earning and redeeming rewards.

Separately, the dashboard stats endpoint computes the **redemptions total from only the 50 most recent log rows** (`take: 50`, then `.filter(type === "redeem").length`), so the headline "redemptions" number silently caps and becomes wrong for any active business. Three small, independent fixes in three files.

## Current state

- `prisma/schema.prisma:70` — `Customer.isActive Boolean @default(true)` (soft-delete flag; `LoyaltyCard` has the same at line 55).
- Exemplar of the correct convention — `app/dashboard/(main)/customers/page.tsx:34-40` already filters:

```ts
prisma.customer.findMany({
  where: {
    card: { businessId: business.id },
    isActive: true,
    ...
```

- **Gap 1** — `app/api/customers/route.ts:74-92` builds its `where` without `isActive`:

```ts
const where: Record<string, unknown> = {
  card: { businessId: business.id },
}
if (q) {
  where.name = { contains: q, mode: "insensitive" }
}
if (cardId) {
  where.cardId = cardId
}
const customers = await prisma.customer.findMany({ where, ... })
```

- **Gap 2** — `app/api/stamps/route.ts:82-99`: after loading the customer it checks existence, tenant, and card expiry — but never `customer.isActive`. (The `findUnique` has an `include` but no `select`, so all customer scalar fields, including `isActive`, are present on the result.)

```ts
if (!customer) {
  throw new NotFoundError("Customer not found")
}
if (customer.card.businessId !== business.id) {
  throw new NotFoundError("Customer not found")
}
if (isExpired(customer.card.expiresAt)) {
  throw new ValidationError("This loyalty card has expired")
}
```

- **Gap 3** — `app/api/dashboard/stats/route.ts:54-72`:

```ts
const allLogs = await prisma.stampLog.findMany({
  where: { customer: { card: { businessId: business.id } } },
  orderBy: { createdAt: "desc" },
  take: 50,
  include: { customer: { select: { name: true, card: { select: { name: true } } } } },
})

const redemptions = allLogs.filter((l) => l.type === "redeem").length
```

  `allLogs` is also used at line 74 for `recentActivity` (`allLogs.slice(0, 10)`) — that use is correct and stays.

- Error classes and `handleApiError` come from `lib/api-utils.ts` (ValidationError→400, NotFoundError→404).
- Tests: `lib/__tests__/stamps-route.test.ts` exists (plan 003, updated by plan 004). There is no test file for `/api/customers` or the stats route; this plan adds small ones.
- Test mocking convention: module-level `vi.mock` of `@/lib/supabase-server`, `@/lib/prisma`, and `next/server` before importing the route — see the harness at the top of `lib/__tests__/stamps-route.test.ts` (or `lib/__tests__/api-utils.test.ts:1-10` if 003 hasn't landed).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Focused tests | `pnpm exec vitest run lib/__tests__/customers-route.test.ts lib/__tests__/stats-route.test.ts lib/__tests__/stamps-route.test.ts` | all pass |
| Full suite | `pnpm test`             | all pass            |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope** (the only files you should modify/create):
- `app/api/customers/route.ts`
- `app/api/stamps/route.ts` (one added check only)
- `app/api/dashboard/stats/route.ts`
- `lib/__tests__/customers-route.test.ts` (create)
- `lib/__tests__/stats-route.test.ts` (create)
- `lib/__tests__/stamps-route.test.ts` (add one case)

**Out of scope** (do NOT touch, even though they look related):
- `app/api/join/route.ts` — its duplicate-check (`findFirst({ where: { email, cardId } })`) intentionally ignores `isActive`; whether a re-joining deleted customer should be revived is a product decision, not part of this plan.
- `app/dashboard/(main)/customers/page.tsx` — already correct.
- The stats endpoint's in-memory aggregation of `stampsGiven` (perf finding, separate concern; see `plans/README.md`).
- `prisma/schema.prisma`.

## Git workflow

- Branch from `dev`: `fix/soft-delete-and-stats`
- Commit style: conventional commits, e.g. `fix: filter inactive customers in API and count all redemptions in stats`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Filter inactive customers in GET /api/customers

In `app/api/customers/route.ts`, change the `where` initializer (line 74) to:

```ts
const where: Record<string, unknown> = {
  card: { businessId: business.id },
  isActive: true,
}
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Reject stamping inactive customers

In `app/api/stamps/route.ts`, immediately after the tenant check (`if (customer.card.businessId !== business.id) { throw new NotFoundError("Customer not found") }`), add:

```ts
if (!customer.isActive) {
  throw new NotFoundError("Customer not found")
}
```

(`NotFoundError`, not a validation message — an inactive customer should be indistinguishable from a nonexistent one, same as the tenant check above it.)

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Count all redemptions in stats

In `app/api/dashboard/stats/route.ts`, replace the in-memory count (line 72):

```ts
const redemptions = await prisma.stampLog.count({
  where: {
    type: "redeem",
    customer: { card: { businessId: business.id } },
  },
})
```

Keep `allLogs` and `recentActivity` exactly as they are (the `take: 50` query is still needed for recent activity). Remove nothing else.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 4: Tests

1. `lib/__tests__/stamps-route.test.ts` — add one case: customer with `isActive: false` (and otherwise valid tenant/card) → 404, and `customer.update` not called.
2. Create `lib/__tests__/customers-route.test.ts` (harness per the convention noted above; mock `prisma.user.findUnique` for the session and `prisma.customer.findMany`):
   - GET returns 200 and the `where` passed to `findMany` includes `isActive: true` (assert call shape);
   - with `?q=ana`, `where.name` equals `{ contains: "ana", mode: "insensitive" }` and `isActive: true` is still present.
   - Note: the route reads `request.url` via `new URL(...)` — the stub request needs a `url` property, e.g. `{ url: "http://test.local/api/customers?q=ana" } as never`.
3. Create `lib/__tests__/stats-route.test.ts` (mock `prisma.loyaltyCard.findMany` → `[]`, `prisma.stampLog.findMany` → `[]`, `prisma.stampLog.count` → `7`):
   - GET returns 200 with `redemptions: 7` (proves the stat comes from `count`, not from the 50-row window);
   - assert `stampLog.count` was called with `{ where: { type: "redeem", customer: { card: { businessId: ... } } } }`.

**Verify**: `pnpm exec vitest run lib/__tests__/customers-route.test.ts lib/__tests__/stats-route.test.ts lib/__tests__/stamps-route.test.ts` → all pass.

### Step 5: Full suite

**Verify**: `pnpm test` → all pass. `pnpm lint` → exit 0.

## Test plan

Enumerated in Step 4. Structural pattern: the mock harness of `lib/__tests__/stamps-route.test.ts` (plan 003). New coverage: inactive-customer rejection (stamps), `isActive` filter call-shape (customers), DB-level redemption count (stats).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "isActive: true" app/api/customers/route.ts` returns a match
- [ ] `grep -n "customer.isActive" app/api/stamps/route.ts` returns a match
- [ ] `grep -n "allLogs.filter" app/api/dashboard/stats/route.ts` returns no match; `grep -n "stampLog.count" app/api/dashboard/stats/route.ts` returns a match
- [ ] `pnpm test` exits 0, including the new/extended test files
- [ ] `npx tsc --noEmit` exits 0; `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The stamps route diverges from what plans 003/004 left behind in a way the excerpts here don't anticipate.
- The scan page (`components/scan/` or `app/dashboard/scan/`) turns out to *depend* on seeing inactive customers (e.g. a "reactivate" feature appears in the code) — that contradicts the premise; report it.
- `recentActivity` tests elsewhere break because of the stats change — the change was supposed to leave `allLogs` untouched; a breakage means something else moved.

## Maintenance notes

- Soft-delete filtering is now enforced in three read paths but it remains **convention, not mechanism**. If more `Customer`/`LoyaltyCard` queries get added, each needs the filter manually. If this recurs, consider a future plan introducing a shared query helper or Prisma client extension that applies `isActive: true` by default — deliberately out of scope here.
- Product decision deferred: what `POST /api/join` should do when a soft-deleted customer re-joins with the same email (currently returns `{ existing: true }` pointing at an inactive record). Surface this to the maintainer.
- Reviewer: confirm the redemptions count and recent activity remain consistent (both scoped to the same business).
