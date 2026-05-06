# AfricaBeauty

Plateforme SaaS de gestion de salon de coiffure : rendez-vous, employées, CA, statistiques.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/africa-beauty run dev` — run the frontend (Vite, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Wouter (routing), TanStack Query, Recharts, Tailwind CSS v4
- API: Express 5, JWT auth (`jsonwebtoken` + `bcryptjs`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → `lib/api-zod`, `lib/api-client-react`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle schema (salons, users, services, appointments)
- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI spec
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `artifacts/api-server/src/routes/` — Express route handlers (auth, salon, users, services, appointments, dashboard)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT sign/verify, requireAuth, requireManager
- `artifacts/africa-beauty/src/pages/` — all React pages
- `artifacts/africa-beauty/src/components/layout.tsx` — sidebar layout

## Architecture decisions

- JWT stored in localStorage (`africa_beauty_token`). Token payload: `{ userId, salonId, role }`, 7-day expiry.
- All routes are scoped to `salonId` from JWT — multi-tenancy ready.
- Price stored as Drizzle `numeric` (string in TS, parsed to float in routes).
- Orval codegen in `mode: "single"` with absolute target path to avoid barrel/workspace conflicts.
- Dashboard routes use `date-fns` for period-based date range queries.

## Product

- **Manager**: dashboard KPIs (CA jour/semaine/mois, taux completion), graphique revenus, classement employées, CRUD rendez-vous/employées/prestations, paramètres salon.
- **Employée**: planning personnel (jour/semaine), statistiques CA personnelles.
- Auth: page de connexion split, redirection automatique selon rôle.

## User preferences

- Interface en français
- Palette terracotta + or (AfricaBeauty brand)

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change.
- Run `pnpm --filter @workspace/db run push` after any schema change.
- Default credentials: `manager@africabeauty.com` / `password123`
- Employee credentials: `aminata@africabeauty.com` / `password123`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.local/skills/pnpm-workspace/references/openapi.md` for codegen details
