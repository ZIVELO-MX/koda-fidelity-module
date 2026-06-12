# Plan 002: Replace the shared hardcoded temporary password with a per-user random password

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5970571..HEAD -- app/api/users/route.ts scripts/ lib/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `5970571`, 2026-06-11

## Why this matters

Every team member invited through the dashboard — across **all** tenant businesses — is created in Supabase Auth with the same temporary password, hardcoded in the source: the constant `DEFAULT_PASSWORD = "Koda1234!"` appears in `app/api/users/route.ts:6` and four CLI scripts. Anyone who reads the repo (or guesses the pattern) and knows or guesses an invitee's email can log into that account **before the invitee does**, becoming that user — including with the `admin` role. The window stays open until the legitimate user completes their first login and the forced password change. This is an account-takeover vulnerability on a multi-tenant system. The fix: generate a cryptographically random per-user password at creation time. The credential still gets shown once to the inviting admin (the existing UI flow depends on this), which is an accepted MVP tradeoff — the unacceptable part is that the credential is *global and public*.

Note: the password value `Koda1234!` is already burned (it is in git history). After this plan lands, the maintainer must reset any existing accounts still carrying it — see Maintenance notes.

## Current state

- `app/api/users/route.ts` — POST creates a team member (admin-only, multi-tenant production path). Verified at commit 5970571:

```ts
// app/api/users/route.ts:6
const DEFAULT_PASSWORD = "Koda1234!"

// app/api/users/route.ts:60-66
const supabase = createAdminClient()
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password: DEFAULT_PASSWORD,
  email_confirm: true,
  user_metadata: { name, must_change_password: true },
})

// app/api/users/route.ts:91-94
return NextResponse.json(
  { user: newUser, authUserId: authData.user.id, temporaryPassword: DEFAULT_PASSWORD },
  { status: 201 },
)
```

- The dashboard UI consumes `temporaryPassword` from that response to show the admin a one-time credentials dialog — `app/dashboard/(main)/team/team-client.tsx:228`:

```ts
setInvitedUser({ name: inviteName, email: inviteEmail, password: data.temporaryPassword })
```

  Keeping the response field name `temporaryPassword` means **zero UI changes**.

- The same constant exists as a **fallback** (used when `--password` is not passed) in four operator CLI scripts:
  - `scripts/create-user.ts:18` — `const DEFAULT_PASSWORD = "Koda1234!"`, used in `parseArgs` as `result.password || DEFAULT_PASSWORD`
  - `scripts/create-client.ts:7` — same constant; line 23: `password: result.password || DEFAULT_PASSWORD`
  - `scripts/reset-password.ts:7` — same constant as reset fallback
  - `scripts/send-invite.ts:6` — same constant; the password is interpolated into the invite email HTML (`buildHtml`), so a random value works the same way
- First-login flow: `lib/actions/auth.ts:43-45` redirects users with `user_metadata.must_change_password` to `/dashboard/update-password`; `updatePassword` clears the flag. This plan does not touch that flow.
- Supabase password policy: project default requires ≥ 6 chars. The generator below produces ~16-char passwords with letters, digits, `-`/`_` (base64url), which satisfies any common policy.
- Repo conventions: shared helpers live in `lib/` as small single-purpose modules (see `lib/card-utils.ts`); unit tests live in `lib/__tests__/*.test.ts` using vitest.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Tests     | `pnpm test`              | all pass (238+ tests) |
| Lint      | `pnpm lint`              | exit 0              |
| Confirm constant gone | `grep -rn "Koda1234" --include="*.ts" --include="*.tsx" app lib scripts components` | no matches |

## Scope

**In scope** (the only files you should modify/create):
- `lib/temp-password.ts` (create)
- `lib/__tests__/temp-password.test.ts` (create)
- `app/api/users/route.ts`
- `scripts/create-user.ts`
- `scripts/create-client.ts`
- `scripts/reset-password.ts`
- `scripts/send-invite.ts`

**Out of scope** (do NOT touch, even though they look related):
- `app/dashboard/(main)/team/team-client.tsx` — the UI keeps working unchanged because the response field name does not change.
- `lib/actions/auth.ts` / the `must_change_password` login flow — unchanged.
- `docs/email-templates/invite.html` — the `{{PASSWORD}}` placeholder still works.
- Rotating existing accounts' passwords — an operational task for the maintainer (see Maintenance notes), not a code change.

## Git workflow

- Branch from `dev`: `fix/random-temp-passwords`
- Commit style: conventional commits in English, e.g. `fix: generate random per-user temporary passwords`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the shared generator

Create `lib/temp-password.ts`:

```ts
import { randomBytes } from "node:crypto"

/**
 * Generates a one-time temporary password for invited users.
 * base64url gives letters, digits, "-" and "_"; 12 bytes ≈ 16 chars.
 */
export function generateTempPassword(): string {
  return `Koda-${randomBytes(12).toString("base64url")}`
}
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Use it in the API route

In `app/api/users/route.ts`:
1. Delete line 6 (`const DEFAULT_PASSWORD = "Koda1234!"`).
2. Add `import { generateTempPassword } from "@/lib/temp-password"`.
3. In POST, before the `createAdminClient()` call, add `const tempPassword = generateTempPassword()`.
4. Replace `password: DEFAULT_PASSWORD` with `password: tempPassword`.
5. Replace `temporaryPassword: DEFAULT_PASSWORD` in the response with `temporaryPassword: tempPassword`.

The response shape must stay exactly `{ user, authUserId, temporaryPassword }` with status 201.

**Verify**: `npx tsc --noEmit` → exit 0. `grep -n "Koda1234" app/api/users/route.ts` → no matches.

### Step 3: Replace the fallback in the four scripts

In each of `scripts/create-user.ts`, `scripts/create-client.ts`, `scripts/reset-password.ts`, `scripts/send-invite.ts`:
1. Delete the `const DEFAULT_PASSWORD = "Koda1234!"` line.
2. Add `import { generateTempPassword } from "../lib/temp-password"` (these scripts already import from `../lib/`, e.g. `scripts/create-user.ts` imports `../lib/supabase-admin`).
3. Replace each `result.password || DEFAULT_PASSWORD` (and any other `DEFAULT_PASSWORD` use) with `result.password || generateTempPassword()`.
4. Each script that *sets or sends* a password must clearly print the password it used to stdout (e.g. `console.log("Password temporal:", password)`). Check each script's existing output: if it already prints the password, keep it; if it doesn't, add it — otherwise the operator can never know the random value.

`--password <value>` behavior must remain: an explicitly passed password is still used as-is.

**Verify**: `grep -rn "Koda1234" --include="*.ts" --include="*.tsx" app lib scripts components` → no matches. `npx tsc --noEmit` → exit 0.

### Step 4: Run the suite

**Verify**: `pnpm test` → all pass; `pnpm lint` → exit 0.

## Test plan

Create `lib/__tests__/temp-password.test.ts`, modeled structurally on `lib/__tests__/card-utils.test.ts` (plain vitest `describe`/`it`, no mocks needed):

- generates a string of length ≥ 12
- two consecutive calls return different values
- output matches `/^Koda-[A-Za-z0-9_-]+$/`

Verification: `pnpm test` → all pass, including the 3 new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "Koda1234" --include="*.ts" --include="*.tsx" app lib scripts components` returns no matches
- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm test` exits 0; `lib/__tests__/temp-password.test.ts` exists and passes
- [ ] `pnpm lint` exits 0
- [ ] POST response in `app/api/users/route.ts` still returns `temporaryPassword` (field name unchanged) — `grep -n "temporaryPassword" app/api/users/route.ts` has a match
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any in-scope file no longer matches the "Current state" excerpts (drift since commit 5970571).
- `team-client.tsx` turns out to read anything other than `data.temporaryPassword` from the creation response (would mean the UI contract is different than planned).
- A script uses `DEFAULT_PASSWORD` in a way other than a fallback for `--password` (different semantics than excerpted) — report instead of guessing.
- You are tempted to remove `temporaryPassword` from the API response entirely — that is a UX/product change (the invite dialog depends on it) and belongs to a separate decision.

## Maintenance notes

- **Operational follow-up for the maintainer (required)**: the old shared password is in git history and may still be active on existing accounts whose owners never logged in. Audit team members created before this change and reset them (`pnpm reset:password --email <email>` now generates a random one).
- Reviewer should scrutinize: that no code path can still produce the literal old password, and that every script prints the generated password (otherwise invites become unusable).
- Deferred (deliberately): emailing the credential instead of returning it in the API response, and enforcing `must_change_password` server-side on API routes (today it's only a login-time redirect). Both are worth a future plan if the team hardens auth further.
