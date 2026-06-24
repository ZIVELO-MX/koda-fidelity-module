# Plan 004: Make stamp and redeem operations atomic (eliminate check-then-act races)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5970571..HEAD -- app/api/stamps/route.ts lib/__tests__/stamps-route.test.ts`
> Plan 003 is EXPECTED to have added `lib/__tests__/stamps-route.test.ts`.
> If `app/api/stamps/route.ts` itself changed beyond what plan 005 describes,
> compare the "Current state" excerpts against the live code; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: plans/003-route-handler-tests.md
- **Category**: bug
- **Planned at**: commit `5970571`, 2026-06-11

## Why this matters

`POST /api/stamps` validates the stamp count and then writes in **two separate queries**, so concurrent requests race. Concretely, at commit 5970571:

- **Stamp race**: two requests for a customer with 9/10 stamps both pass the `stamps >= stampsRequired` check (line 102), both increment → 11/10. The card state breaks the invariant the redeem logic depends on.
- **Redeem race** (the costly one): two requests for a customer with 10/10 both pass the `stamps < stampsRequired` check (line 127), both set stamps to 0 and both create a `redeem` log → **the business gives out the reward twice**. A double-tap on the scan page button or two employees scanning the same QR is enough to trigger this; no attacker needed.

The fix is to push the condition into the `UPDATE`'s `WHERE` clause so check and write are one atomic statement. Prisma supports non-unique filter fields in `update.where` alongside the unique `id` (stable since Prisma 5; this repo uses Prisma 6). When no row matches, Prisma throws a known error with code `P2025`, which we map to the same 400 responses the route returns today — the API contract does not change.

## Current state

- `app/api/stamps/route.ts` — the only file with the bug. The two racing sections, verified at commit 5970571:

```ts
// app/api/stamps/route.ts:101-117 (stamp branch)
if (type === "stamp") {
  if (customer.stamps >= customer.card.stampsRequired) {
    throw new ValidationError("Customer has completed the card and must redeem first.")
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      stamps: { increment: 1 },
      stampsLog: {
        create: { type: "stamp" },
      },
    },
    include: {
      card: { select: { name: true, stampsRequired: true, reward: true } },
    },
  })
  // ...returns { customer: updated, event: "stamp", message }
```

```ts
// app/api/stamps/route.ts:126-144 (redeem branch)
if (type === "redeem") {
  if (customer.stamps < customer.card.stampsRequired) {
    throw new ValidationError(
      `Customer needs ${customer.card.stampsRequired - customer.stamps} more stamps to redeem`,
    )
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      stamps: 0,
      stampsLog: {
        create: { type: "redeem" },
      },
    },
    // ...same include
  })
  // ...returns { customer: updated, event: "redeem", message }
```

- Error mapping: the route's catch calls `handleApiError` (`lib/api-utils.ts:93-108`); `ValidationError` → 400. `ValidationError` is imported at the top of the route from `@/lib/api-utils`.
- Before these branches, the route already loads the customer (with `card.stampsRequired`) and enforces tenant + expiry checks (lines 82–99). Those checks stay — only the branch bodies change.
- Characterization tests from plan 003 exist at `lib/__tests__/stamps-route.test.ts` and assert the current `update` call shapes; this plan updates those assertions (see Test plan).
- Prisma version: `@prisma/client` `^6` (`package.json:92`). Error type for no-match updates: `Prisma.PrismaClientKnownRequestError` with `code === "P2025"`, importable as `import { Prisma } from "@prisma/client"`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Focused tests | `pnpm exec vitest run lib/__tests__/stamps-route.test.ts` | all pass |
| Full suite | `pnpm test`             | all pass            |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `app/api/stamps/route.ts`
- `lib/__tests__/stamps-route.test.ts` (update assertions, add race-semantics cases)

**Out of scope** (do NOT touch, even though they look related):
- `lib/__tests__/stamps.test.ts` — the legacy pure-logic test; its local `processStamp` copy is untouched by this change.
- `app/api/join/route.ts`, `lib/actions/auth.ts` — they have their own (lower-impact) check-then-act patterns; deliberately deferred (see `plans/README.md`).
- The response JSON shape and messages — clients (scan page) depend on them; keep messages byte-identical.
- `prisma/schema.prisma` — no schema change is needed.

## Git workflow

- Branch from `dev`: `fix/atomic-stamp-redeem`
- Commit style: conventional commits, e.g. `fix: make stamp and redeem updates atomic via conditional where`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make the stamp branch atomic

In `app/api/stamps/route.ts`, add `import { Prisma } from "@prisma/client"` at the top. Rewrite the stamp branch so the guard lives in the `where`:

```ts
if (type === "stamp") {
  let updated
  try {
    updated = await prisma.customer.update({
      where: {
        id: customer.id,
        stamps: { lt: customer.card.stampsRequired },
      },
      data: {
        stamps: { increment: 1 },
        stampsLog: {
          create: { type: "stamp" },
        },
      },
      include: {
        card: { select: { name: true, stampsRequired: true, reward: true } },
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new ValidationError("Customer has completed the card and must redeem first.")
    }
    throw e
  }

  return NextResponse.json({
    customer: updated,
    event: "stamp",
    message: `${customer.name} now has ${updated.stamps} stamps`,
  })
}
```

The old pre-check (`if (customer.stamps >= ...)`) is **removed** — the conditional `where` is now the single source of truth. The error message must stay exactly `"Customer has completed the card and must redeem first."`.

**Verify**: `npx tsc --noEmit` → exit 0. (If TypeScript rejects `stamps` inside `update.where`, see STOP conditions.)

### Step 2: Make the redeem branch atomic

Same pattern, inverted condition. Note the error message interpolates the *read* stamp count; keep using the pre-loaded `customer.stamps` for the message (a slightly stale count in an error message is acceptable and keeps the contract identical):

```ts
if (type === "redeem") {
  let updated
  try {
    updated = await prisma.customer.update({
      where: {
        id: customer.id,
        stamps: { gte: customer.card.stampsRequired },
      },
      data: {
        stamps: 0,
        stampsLog: {
          create: { type: "redeem" },
        },
      },
      include: {
        card: { select: { name: true, stampsRequired: true, reward: true } },
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new ValidationError(
        `Customer needs ${customer.card.stampsRequired - customer.stamps} more stamps to redeem`,
      )
    }
    throw e
  }

  return NextResponse.json({
    customer: updated,
    event: "redeem",
    message: `${customer.name} redeemed ${customer.card.reward}`,
  })
}
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Update the characterization tests

In `lib/__tests__/stamps-route.test.ts` (from plan 003):

1. **Happy paths (stamp + redeem)**: update the `customer.update` call-shape assertions — `where` now includes the condition: `{ id: ..., stamps: { lt: 10 } }` for stamp, `{ id: ..., stamps: { gte: 10 } }` for redeem.
2. **Full-card stamp rejection** and **insufficient redeem rejection**: these previously asserted `update` was NOT called. Now the route always attempts the update; make the mock **reject** with a `P2025` error and assert the 400 + identical message. Build the error like:

```ts
import { Prisma } from "@prisma/client"

function p2025() {
  return new Prisma.PrismaClientKnownRequestError("No record found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
}
```

3. **New case — unexpected Prisma errors still 500**: mock `update` to reject with a generic `Error` → expect status 500 (proves the catch only swallows P2025).

**Verify**: `pnpm exec vitest run lib/__tests__/stamps-route.test.ts` → all pass.

### Step 4: Full suite

**Verify**: `pnpm test` → all pass. `pnpm lint` → exit 0.

## Test plan

Covered in Step 3. Pattern to follow: the existing harness in `lib/__tests__/stamps-route.test.ts`. Net effect: same case list as plan 003 plus one new 500-path case, with call-shape assertions proving the guard moved into `where`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "stamps: { lt:" app/api/stamps/route.ts` and `grep -n "stamps: { gte:" app/api/stamps/route.ts` each return a match (guards live in `where`)
- [ ] `grep -n "customer.stamps >= customer.card.stampsRequired" app/api/stamps/route.ts` returns no match (pre-check removed)
- [ ] `pnpm exec vitest run lib/__tests__/stamps-route.test.ts` → all pass, including the P2025-rejection cases
- [ ] `pnpm test` exits 0; `npx tsc --noEmit` exits 0; `pnpm lint` exits 0
- [ ] Response messages are byte-identical to the originals (the three `ValidationError` strings and the two success `message` templates)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `lib/__tests__/stamps-route.test.ts` does not exist (plan 003 has not run) — this plan depends on it.
- TypeScript rejects non-unique fields (`stamps`) inside `prisma.customer.update`'s `where`. That would mean the generated client predates extended where support — do NOT fall back to `$transaction` improvisation; report it so the approach can be re-decided.
- The route no longer matches the Current state excerpts in any way other than plan 005's documented changes (an `isActive` check after line 95 is expected if 005 landed first; anything else is drift).
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The invariant after this lands: `stamps` can never exceed `stampsRequired` via this endpoint, and a reward can never be double-redeemed by concurrent requests. A reviewer should specifically confirm no code path performs a read-check-write on `Customer.stamps` outside the conditional update.
- If a future feature edits stamps elsewhere (e.g. an admin "adjust stamps" endpoint), it must use the same conditional-where pattern.
- Deferred deliberately: the analogous (low-traffic, invite-only-gated) check-then-act in `lib/actions/auth.ts:111-127` (signup business creation) — recorded in `plans/README.md` under rejected/deferred findings.
