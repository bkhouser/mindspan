# Mindspan

Mindspan is a private, game-like trivia trainer for invited groups. It combines typed recall, optional multiple-choice assistance, adaptive question scheduling, personalized scoring, points-based leaderboards, achievements, and individually unlocked question packs.

## What is implemented

- Invite-gated email/password authentication, password recovery, and a seeded first-admin path
- Streamlined onboarding with required interest selection and immediate play
- Unlimited mixed, topic, and pack play with server-authoritative scoring and one-answer presentations
- Answer normalization, authored aliases, conservative typo acceptance, timed points, assisted answers, explanations, sources, reports, and break suggestions
- Literal correct-answer topic proficiency, confidence-weighted tiers, adaptive difficulty, novelty/review scheduling, and competitive retirement after four recalls
- Data-driven achievements, append-only Insight ledger, starter-pack ownership, and idempotent pack unlocks
- Multiple private groups, scoped admins, invitations, aggregate profiles, activity feeds, points leaderboards, and Venn/heatmap coverage views
- Versioned global content, publication workflow, compact player reactions, pack-by-pack editorial review/export, private media metadata/storage, reports, audit records, and JSON import validation
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

1. Create separate staging and production Supabase projects, apply `supabase/migrations`, run the seed, then run `npm run catalog:load`.
2. Create private `question-media` and `avatars` buckets using the checked-in configuration/policies.
3. Verify the sending domain in Resend and configure it as Supabase custom SMTP. Update Auth site URL and allowed redirects for staging and production. Enable email confirmation and customize confirmation, recovery, and security-notification templates.
4. Create Vercel preview and production environments with the variables in `.env.example`. Never expose the secret key as a `NEXT_PUBLIC_` variable.
5. Set `INITIAL_SYS_ADMIN_EMAIL` for the initial deployment. Use that email to create the first account without an invite, then remove or rotate the bootstrap value after another admin is promoted.
6. Run migrations first, deploy the application, verify `/api/health`, test password confirmation and recovery, complete the acceptance journeys, and only then issue beta invitations.

`npm run build` produces a deployment-ready standalone artifact in `.next/standalone`, including the required Next.js static assets and the production-environment verifier. Supabase credentials are read by the server at runtime and the build fails if the publishable key is accidentally embedded. From the standalone directory, run `npm run production:verify-env` from the source checkout or `node scripts/verify-production-env.mjs` from the artifact before starting `node server.js`; then supply `HOSTNAME`, `PORT`, and the Mindspan environment variables through the process supervisor.

## Content status

The beta catalog contains 1,100 text questions across fourteen packs: eight free starter packs with 100 questions each, four themed 100-Insight expansions with 50 each, the free 50-question **Easy Does It** pack, and the 100-Insight 50-question **Trivia 101** pack. The seed supplies 40 representative questions and the versioned catalog supplies the other 1,060. Wikidata provides structured factual questions; the entertainment, culture, and beginner catalog uses the CC BY-SA Open Trivia Database snapshot dated December 27, 2024.

Run `npm run catalog:validate` before every catalog change, `npm run catalog:load` after migrations or a database reset, and `npm run catalog:verify` to check live totals, pricing, and initial availability. Loading is idempotent and published edits create immutable question versions. This is a playtest catalog: user-contributed questions still require editorial review as beta feedback identifies ambiguous wording, stale facts, weak distractors, or miscalibrated difficulty.

See `docs/content-runbook.md` for the required import fields and review checklist, and `docs/architecture.md` for security and scoring boundaries.

Future product candidates and their current definition status are tracked in
`docs/feature-roadmap.md`.
