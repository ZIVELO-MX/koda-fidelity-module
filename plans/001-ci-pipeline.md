# Plan 001: Add a CI pipeline that gates every PR with lint, typecheck, and tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5970571..HEAD -- .github/ package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `5970571`, 2026-06-11

## Why this matters

The repo has a healthy local verification story — 238 vitest tests across 23 files, a clean `tsc --noEmit`, and ESLint — but **nothing runs automatically**: there is no `.github/workflows/` directory at all. The team's own workflow (documented in `roadmap.md`: "Solo PRs a `dev` — nunca push directo a `main`", all features via PR with code review) assumes quality gates that currently depend on each contributor remembering to run them. A PR that breaks types or tests merges silently. This plan is also a prerequisite in spirit for the other plans in `plans/`: it makes their "done criteria" enforceable on every future change.

## Current state

- `.github/` does not exist in the repo (verified: `ls .github` fails).
- `package.json` scripts (relevant subset, verified at commit 5970571):

```json
"scripts": {
  "build": "prisma generate && next build",
  "lint": "eslint .",
  "test": "vitest run",
  "db:generate": "prisma generate",
  ...
}
```

- There is **no `typecheck` script**; typechecking is done with `npx tsc --noEmit` (verified to exit 0 at commit 5970571).
- Toolchain versions verified on the dev machine: **Node v22**, **pnpm 11.5.2**. There is a `pnpm-lock.yaml` and a `pnpm-workspace.yaml` at the root.
- **Important**: `tsc` and the test suite import `@prisma/client` (e.g. `lib/api-utils.ts:4` imports `type { Role } from "@prisma/client"`). The Prisma client must be generated before typecheck/tests run in CI. `prisma generate` does NOT need a database connection or `DATABASE_URL` — it only reads `prisma/schema.prisma`.
- `pnpm test` runs `vitest run` with jsdom environment (`vitest.config.mjs`); it does not need a database (unit tests mock Prisma).
- Playwright e2e tests exist (`e2e/`, script `pnpm e2e`) but need a running app and real Supabase credentials — they are **out of scope** for this CI pipeline.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install --frozen-lockfile` | exit 0      |
| Generate Prisma client | `pnpm db:generate` | exit 0, "Generated Prisma Client" |
| Lint      | `pnpm lint`              | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0, no output   |
| Tests     | `pnpm test`              | exit 0, "23 passed" test files, 238 tests |
| Validate workflow YAML | `npx --yes yaml-lint .github/workflows/ci.yml` (or any YAML parse) | valid YAML |

## Scope

**In scope** (the only files you should modify/create):
- `.github/workflows/ci.yml` (create)
- `package.json` (one addition only: a `"typecheck": "tsc --noEmit"` script)

**Out of scope** (do NOT touch, even though they look related):
- `pnpm e2e` / Playwright in CI — needs secrets and a running app; defer.
- `pnpm build` in CI — `next build` needs Supabase env vars not available in CI; defer (can be added later with repo secrets).
- Branch protection rules — GitHub settings, not code; mention in the PR description for the maintainer to flip manually.
- Any source file under `app/`, `lib/`, `components/`.

## Git workflow

- Branch from `dev`: `feat/ci-pipeline`
- Commit style: conventional commits in English, e.g. `feat: add CI workflow with lint, typecheck and tests` (matches repo history, e.g. `feat: add reset:password script...`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a `typecheck` script to package.json

In `package.json`, add to `"scripts"` (next to `"lint"`):

```json
"typecheck": "tsc --noEmit",
```

**Verify**: `pnpm typecheck` → exit 0, no errors.

### Step 2: Create the workflow file

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [dev, main]
  pull_request:
    branches: [dev, main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm db:generate

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Tests
        run: pnpm test
```

**Verify**: the file parses as YAML (e.g. `node -e "require('js-yaml')"` is not needed — simplest: `npx --yes js-yaml .github/workflows/ci.yml > /dev/null` → exit 0. If `js-yaml` is unavailable offline, visually confirm indentation and run Step 3 as the real gate).

### Step 3: Run the full pipeline locally in order

Run exactly what CI will run, in order:

```bash
pnpm install --frozen-lockfile && pnpm db:generate && pnpm lint && pnpm typecheck && pnpm test
```

**Verify**: every command exits 0; vitest reports `Test Files  23 passed` and `Tests  238 passed` (or more, if other plans landed first — any fully green run is a pass).

## Test plan

No new unit tests — the deliverable IS the test gate. Local verification (Step 3) plus, after the PR is opened by the operator, the workflow appearing green on GitHub Actions is the end-to-end proof.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `.github/workflows/ci.yml` exists and is valid YAML
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `git status` shows no modified files outside `.github/workflows/ci.yml` and `package.json`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm install --frozen-lockfile` fails (lockfile drift — do not regenerate the lockfile; report it).
- `pnpm lint`, `pnpm typecheck`, or `pnpm test` fails on an untouched working tree (a pre-existing failure must be reported, not fixed here).
- You feel the need to add env vars/secrets to the workflow — that means you're pulling `build` or `e2e` into scope; both are explicitly deferred.

## Maintenance notes

- When the maintainer wants `next build` in CI, add a `build` job with the required `NEXT_PUBLIC_*`/Supabase env vars as GitHub repo secrets.
- The maintainer should enable branch protection on `dev` and `main` requiring the `verify` check — that's a GitHub settings change, not code.
- If pnpm major version changes in `packageManager`/local toolchain, update `pnpm/action-setup`'s `version` to match.
