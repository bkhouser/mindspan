# Architecture and trust boundaries

Mindspan is one Next.js App Router deployment backed by Supabase PostgreSQL, Auth, and private Storage. Server Components perform authenticated reads, Server Actions handle normal forms, and Route Handlers own the active game protocol.

The browser never receives canonical answers, aliases, distractors, explanations, or sources with the initial presentation. It receives those only after the answer transaction finalizes. The server records presentation time, assistance, scoring inputs, algorithm version, mastery evidence, and idempotency keys. The client timer is feedback; PostgreSQL-backed server timestamps remain authoritative.

All user-facing tables have row-level security. Attempts and typed answers are private. Shared-group policies expose only profiles, aggregate topic mastery, achievements, and pack ownership. Group administration is membership-scoped; global content and pack availability require `sys_admin`. Private media is served through short-lived signed URLs.

The important mutations are database functions:

- `finalize_attempt_v1` atomically records the attempt, finalizes the presentation, updates question state and topic mastery, and emits group activity.
- `award_achievement_v1` idempotently awards an achievement and appends Insight currency.
- `unlock_pack_with_insight` locks the user's ledger balance, deducts currency, preserves ownership, and emits unlock activity.
- `redeem_invite_for_user` hashes invitation tokens, consumes usage under a lock, grants beta access, and joins a group when applicable.

Score and mastery math remains in pure TypeScript modules under `src/domain`, with algorithm versions persisted in attempt snapshots. Published question versions are immutable in product behavior; editing produces a new version while attempts retain their original version.
