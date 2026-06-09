# Technology Stack

This document describes the technologies used in the Koda Fidelity Module and the degree of dependency the project has on each one.

Dependency levels:
- **Low** — used for a narrow concern; replaceable without major refactoring
- **Medium** — integrated across several layers; replacement would require meaningful effort
- **High** — deeply embedded in core architecture; replacing it would effectively mean rewriting the application

---

## Core Framework

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **Next.js** | 16.2 | High | App Router, Server Components, API Routes, and middleware are all built on Next.js conventions. The entire routing and rendering model depends on it. |
| **React** | 19 | High | All UI is built with React. Cannot be replaced without rewriting every component. |
| **TypeScript** | 6.0 | High | Used project-wide. Removing it would require converting all `.ts`/`.tsx` files. |

---

## Database & ORM

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **PostgreSQL** | — | High | The relational data model (Business, LoyaltyCard, Customer, StampLog) is built for PostgreSQL. Migrations are tied to it. |
| **Prisma** | 6 | High | All database access goes through Prisma Client. The schema, migrations, seed scripts, and every data access call use Prisma exclusively. |

---

## Authentication & Backend-as-a-Service

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **Supabase** | 2.x | High | Handles user authentication (email/password, OAuth), session management via SSR cookies, and file storage. Auth flows, protected routes, and the storage layer all depend on it. |
| **Google OAuth** | — | Medium | Used as a social login provider via Supabase. Removing it would only affect that sign-in option. |

---

## Wallet Integrations

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **Apple Wallet (passkit-generator)** | 3.5 | Medium | Generates `.pkpass` files for iOS. Depends on Apple-issued certificates stored in `certificates/`. Self-contained in `lib/passes/apple.ts`; removable without affecting the rest of the app. |
| **Google Wallet (`@googleapis/walletobjects`)** | 12 | Medium | Issues loyalty passes to Google Wallet via a service account. Self-contained in `lib/passes/google.ts`. Requires a Google Cloud project and service account credentials. |
| **jsonwebtoken** | 9 | Low | Used only to sign Google Wallet JWT tokens. |
| **google-auth-library** | 10 | Low | Used only for Google Wallet service account authentication. |

---

## UI & Styling

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **Tailwind CSS** | 4 | High | Utility classes are used directly in every component. Replacing it would require rewriting all markup styles. |
| **shadcn/ui + Radix UI** | — | High | The full component library (dialogs, dropdowns, forms, etc.) is built on Radix UI primitives via shadcn/ui. Replacing it would mean rebuilding every UI component. |
| **Lucide React** | 1.14 | Low | Icon set. Swappable with any other icon library. |
| **class-variance-authority + clsx + tailwind-merge** | — | Medium | Used in every component for variant and conditional class handling. Tightly coupled to the shadcn/ui component patterns. |
| **next-themes** | 0.4 | Low | Dark/light mode toggle. Easy to remove or swap. |

---

## Forms & Validation

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **react-hook-form** | 7 | Medium | Manages all forms in the app. Used alongside Zod for schema validation. |
| **Zod** | 4 | Medium | Schema validation for forms and API input. Used in multiple routes and components. |
| **@hookform/resolvers** | 5 | Low | Bridge between react-hook-form and Zod. Only needed because both are used together. |

---

## Data Visualization

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **Recharts** | 3.8 | Low | Used in the business dashboard for stamp/redemption charts. Limited to a few dashboard components. |

---

## Image Processing

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **sharp** | 0.34 | Medium | Converts SVG icons to PNG buffers for embedding in Apple Wallet passes. Required at build/generation time for pass creation. |

---

## QR Code

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **qrcode.react** | 4 | Low | Renders QR codes on the customer-facing join/card pages. |
| **@yudiel/react-qr-scanner** | 2.6 | Low | Camera-based QR scanner for stamp and redeem flows. Replaceable independently. |

---

## API Documentation

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **swagger-jsdoc** | 6 | Low | Generates OpenAPI spec from JSDoc comments in API route files. |
| **swagger-ui-react** | 5 | Low | Renders the interactive API docs UI at `/api/openapi`. |

---

## Analytics

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **Vercel Analytics** | 2.0 | Low | Page view and event tracking injected in the root layout. Trivial to remove. |

---

## Testing

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **Vitest** | 4 | Low | Unit and integration test runner. Only affects the test suite. |
| **Playwright** | 1.60 | Low | End-to-end tests in `e2e/`. Only affects the test suite. |
| **@testing-library/react** | 16 | Low | React component testing utilities used with Vitest. |

---

## Package Management & Tooling

| Technology | Version | Dependency | Notes |
|---|---|---|---|
| **pnpm** | — | Medium | Workspace manager and package installer. Scripts and the workspace config (`pnpm-workspace.yaml`) assume pnpm. Switching to npm/yarn requires minor script changes. |
| **tsx** | 4 | Low | Runs TypeScript scripts directly (seeding, utility scripts). Not involved in the application build. |
| **ESLint** | 9 | Low | Linting only. Does not affect runtime behavior. |
| **PostCSS + autoprefixer** | — | Low | CSS post-processing for Tailwind. Managed by the Tailwind build pipeline. |

---

## Infrastructure Assumptions

- **Deployment target**: Vercel (implied by `@vercel/analytics` and Next.js conventions).
- **Database host**: Supabase-managed PostgreSQL (two connection URLs: pooled `DATABASE_URL` and direct `DIRECT_URL`).
- **File storage**: Supabase Storage (used for business logos referenced in wallet passes).
- **Certificates**: Apple Wallet certificates and Google Wallet service account keys are stored in the `certificates/` directory and referenced via environment variables at runtime.
