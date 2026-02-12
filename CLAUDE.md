# CLAUDE.md — Cartographer Prototype 2

## Project Overview

Cartographer is an AI-powered financial guidance web application built with Next.js 14. It helps users make informed decisions about debt payoff, homeownership, career moves, and long-term wealth building using real tax data, cost-of-living metrics, and salary projections across US cities and states.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 3 |
| Database | SQLite (dev) via Prisma 5 ORM |
| Auth | iron-session (encrypted cookies) + bcryptjs |
| Package Manager | npm |

## Quick Start

```bash
cp .env.example .env          # configure DATABASE_URL & SESSION_SECRET
npm install
npx prisma generate           # generate Prisma client
npx prisma db push            # create/sync SQLite database
npm run dev                   # start dev server at localhost:3000
```

## Commands

- `npm run dev` — Start Next.js dev server with HMR
- `npm run build` — Production build
- `npm run start` — Run production server
- `npm run lint` — ESLint with next/core-web-vitals rules
- `npx prisma generate` — Regenerate Prisma client after schema changes
- `npx prisma db push` — Push schema changes to database
- `npx prisma studio` — Visual database browser

## Project Structure

```
/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (Inter font, metadata)
│   ├── page.tsx                # Landing page (hero, features, CTAs)
│   ├── globals.css             # Tailwind directives + custom styles
│   ├── middleware.ts           # Route protection (/account, /questionnaire)
│   ├── signup/                 # Signup page + success page
│   ├── login/                  # Login page
│   ├── account/                # Protected account page + logout button
│   ├── onboarding/             # 9-step onboarding wizard
│   ├── questionnaire/          # Questionnaire display (protected)
│   ├── stress-test/            # Stress test / results page
│   └── api/
│       ├── auth/
│       │   ├── signup/route.ts     # POST — user registration
│       │   ├── login/route.ts      # POST — login (password verify)
│       │   ├── logout/route.ts     # POST — session destruction
│       │   ├── me/route.ts         # GET — current user info
│       │   └── demo-mode/route.ts  # GET — demo mode detection
│       └── salary/
│           └── lookup/route.ts     # GET — salary data by location/occupation
├── components/
│   └── onboarding/
│       └── OnboardingWizard.tsx    # Multi-step form with conditional fields
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   ├── session.ts              # iron-session config & helpers
│   ├── storage.ts              # localStorage helpers (client-side persistence)
│   ├── data.ts                 # JSON workbook loader (State_City_Data_Final.json)
│   ├── salary.ts               # Salary lookup by state/city + occupation
│   ├── occupations.ts          # 22 BLS occupation categories
│   ├── locations.ts            # Location search & deduplication
│   └── onboarding/
│       ├── types.ts            # OnboardingAnswers & UserProfile interfaces
│       ├── schema.ts           # 9-step form schema with conditional visibility
│       ├── normalize.ts        # Raw answers → normalized UserProfile
│       └── locations.ts        # Location-specific onboarding data
├── data/
│   └── State_City_Data_Final.json  # ~70K lines: salary/affordability data for US locations
├── prisma/
│   └── schema.prisma           # Database schema (User model, SQLite)
├── public/                     # Static assets (icons, logo)
├── scripts/                    # Utility scripts (JSON data fixing)
└── Icons/                      # Design assets and mockups
```

## Architecture

### Server vs Client Components

Next.js App Router defaults to **Server Components**. Files that need interactivity use the `"use client"` directive:

- **Server**: Root layout, account page (Prisma queries), API routes
- **Client**: Signup/login forms, onboarding wizard, logout button

### Authentication Flow

1. iron-session encrypts session data in an HttpOnly cookie (`cartographer_session`)
2. `middleware.ts` protects `/account` and `/questionnaire` by checking for the session cookie
3. `lib/session.ts` exports `getSession()`, `getCurrentUserId()`, `getCurrentUser()`
4. Password hashing uses bcryptjs
5. Demo mode (`DEMO_AUTH=1`) bypasses DB validation for testing

### Data Pipeline

1. `lib/data.ts` loads `data/State_City_Data_Final.json` (workbook with sheets)
2. `lib/salary.ts` performs salary lookups by location + BLS occupation category
3. `lib/occupations.ts` defines 22 occupation categories from Bureau of Labor Statistics
4. `lib/locations.ts` handles location search with name normalization and deduplication

### Onboarding System

The 9-step questionnaire wizard collects financial profile data:

1. **Goal** — What the user wants to figure out
2. **Status** — Student/employed/independent
3. **Household** — Relationship, family planning
4. **Career** — Occupation, salary, income stability
5. **Support** — Financial support sources
6. **Debt & Savings** — Loans, credit cards, savings
7. **Preferences** — Allocation, priorities, mortgage timeline
8. **Locations** — Current/desired locations
9. **Review** — Summary before submission

Key patterns:
- Schema-driven: `lib/onboarding/schema.ts` defines all steps, fields, and conditional visibility
- Field types: select, multiselect, number, text, checkbox, slider, occupation picker, location picker, debt table, support entries
- `showWhen` enables conditional field visibility based on previous answers
- `lib/onboarding/normalize.ts` converts raw `OnboardingAnswers` → `UserProfile` with derived flags
- Client-side persistence via localStorage (`lib/storage.ts`)

### State Management

- **Server-side**: Prisma for database, iron-session for auth
- **Client-side**: React hooks (useState/useCallback) + localStorage for onboarding state
- No external state library (Redux, Zustand, etc.)

## Database

Prisma schema (`prisma/schema.prisma`) with a single `User` model:

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

SQLite for local development. The schema is designed to be portable to PostgreSQL.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string (`file:./dev.db` for SQLite) |
| `SESSION_SECRET` | Yes | Min 32-character secret for iron-session encryption |
| `DEMO_AUTH` | No | Set to `1` to enable demo mode (no DB validation) |

## Code Conventions

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig)
- Path alias: `@/*` maps to project root (e.g., `import { prisma } from "@/lib/db"`)
- Target: ES2017

### Styling
- Tailwind CSS utility classes exclusively — no CSS modules or styled-components
- Global styles in `app/globals.css`

### API Routes
- Located under `app/api/` using Next.js Route Handlers
- Return `NextResponse.json()` with appropriate status codes
- Auth routes under `app/api/auth/`

### Error Handling
- Defensive try/catch with fallbacks throughout data loading
- localStorage access wrapped in safe getters/setters
- API errors return null gracefully rather than throwing

### Component Patterns
- Forms use controlled components with `useState`
- Side effects managed via `useCallback` at the top level (React hooks rules)
- Conditional rendering driven by schema-based `showWhen` logic

## Testing

No testing framework is currently configured. When adding tests:
- Consider Vitest or Jest for unit tests
- Consider Playwright for E2E tests
- The onboarding schema and normalization logic are good candidates for unit testing

## Linting

ESLint extends `next/core-web-vitals`. Run with:

```bash
npm run lint
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `middleware.ts` | Route protection (redirects unauthenticated users to /login) |
| `lib/session.ts` | Session configuration, `getSession()`, `getCurrentUser()` |
| `lib/db.ts` | Prisma client singleton (avoids multiple instances in dev) |
| `lib/onboarding/schema.ts` | Onboarding wizard step/field definitions |
| `lib/onboarding/types.ts` | `OnboardingAnswers` and `UserProfile` type definitions |
| `lib/onboarding/normalize.ts` | Converts raw answers to normalized profile |
| `lib/storage.ts` | Client-side localStorage helpers for onboarding persistence |
| `lib/salary.ts` | Salary data lookup by location and occupation |
| `lib/occupations.ts` | BLS occupation category definitions |
| `data/State_City_Data_Final.json` | Large JSON dataset (~70K lines) — do not edit manually |

## Common Tasks

### Adding a new API route
Create a `route.ts` file under `app/api/<path>/` exporting HTTP method handlers (GET, POST, etc.).

### Adding a new page
Create a `page.tsx` under `app/<path>/`. Server Component by default; add `"use client"` if interactivity is needed.

### Modifying the onboarding flow
1. Update `OnboardingAnswers` interface in `lib/onboarding/types.ts`
2. Add/modify fields in `lib/onboarding/schema.ts`
3. Update normalization logic in `lib/onboarding/normalize.ts`
4. Update `OnboardingWizard.tsx` if new field types are needed

### Changing the database schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (dev) or create a migration with `npx prisma migrate dev`
3. Run `npx prisma generate` to update the client
