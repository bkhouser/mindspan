# Mindspan

Mindspan is a private, game-like trivia trainer for invited groups. It combines typed recall, optional multiple-choice assistance, adaptive question scheduling, personalized scoring, mastery-based leaderboards, achievements, and individually unlocked question packs.

## What is implemented

- Invite-gated, passwordless Supabase authentication with a seeded first-admin path
- Resumable 32-question adaptive assessment and required interest selection
- Unlimited mixed, topic, and pack play with server-authoritative scoring and one-answer presentations
- Answer normalization, authored aliases, conservative typo acceptance, timed points, assisted answers, explanations, sources, reports, and break suggestions
- Bayesian topic proficiency, weighted Wilson ranking, adaptive difficulty, novelty/review scheduling, and competitive retirement after four recalls
- Data-driven achievements, append-only Insight ledger, starter-pack ownership, and idempotent pack unlocks
- Multiple private groups, scoped admins, invitations, aggregate profiles, activity feeds, mastery leaderboards, and Venn/heatmap coverage views
- Versioned global content, publication workflow, private media metadata/storage, reports, audit records, and JSON import validation
- PostgreSQL row-level security, transactional attempt/progression RPCs, generated database types, CI, unit/property tests, and Playwright smoke tests

## Local setup

Prerequisites: Node.js 20+, Docker Desktop, and a Docker daemon available to the current user.

On Windows, double-click `start.bat` for the normal one-command startup. It installs missing Node dependencies, starts Docker Desktop and Supabase when needed, generates `.env.local`, launches the development server, and opens Mindspan in the default browser.

```powershell
npm install
npx supabase start
npm run db:types
Copy-Item .env.example .env.local
```

Fill `.env.local` from `npx supabase status -o env`:

- `NEXT_PUBLIC_SUPABASE_URL` = `API_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` = `SECRET_KEY`
- `INITIAL_SYS_ADMIN_EMAIL` = the email that should bootstrap the first system admin

Then run:

```powershell
npm run dev
```

Local services are available at `http://127.0.0.1:54321` (API), `http://127.0.0.1:54323` (Studio), and `http://127.0.0.1:54324` (Mailpit). Supabase's local defaults are development secrets only and must never be reused in hosted environments.

## Validation

```powershell
npm run check
npm run test:e2e
npx supabase db reset
```

`npm run check` runs lint, TypeScript, unit/property tests, and a production build. The generated schema types live in `src/types/database.generated.ts` and should be regenerated after every migration.

## Hosted beta setup

1. Create separate staging and production Supabase projects and apply `supabase/migrations` plus the reviewed seed/content import.
2. Create private `question-media` and `avatars` buckets using the checked-in configuration/policies.
3. Verify the sending domain in Resend and configure it as Supabase custom SMTP. Update Auth site URL and allowed redirects for staging and production.
4. Create Vercel preview and production environments with the five variables in `.env.example`. Never expose the secret key as a `NEXT_PUBLIC_` variable.
5. Set `INITIAL_SYS_ADMIN_EMAIL` for the initial deployment, sign in once, then remove or rotate that bootstrap value after another admin is promoted.
6. Run migrations first, deploy the application, verify `/api/health`, complete the acceptance journeys, and only then issue beta invitations.

## Content status

The repository seeds 40 reviewed-format representative text questions—one at every difficulty in all eight topics—plus eight starter packs, four 100-Insight expansion packs, and seven achievements. The planned initial catalog targets 100 questions per starter pack and 50 per standard expansion pack: 1,000 reviewed questions across the current twelve packs. Starter packs target an average difficulty near 3.0/5; explicitly labeled advanced expansions may skew substantially harder. The complete catalog and licensed media are editorial/licensing deliverables, not generated filler. Import them into review after source and license verification, then publish through the admin workshop.

See `docs/content-runbook.md` for the required import fields and review checklist, and `docs/architecture.md` for security and scoring boundaries.

Future product candidates and their current definition status are tracked in
`docs/feature-roadmap.md`.
