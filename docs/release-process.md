# Release and change-tracking process

Mindspan has invited beta users as of `0.2.0-beta.5`. Treat every production
deployment after that baseline as an update to a system containing durable user
data.

## Track changes while implementing

Every user-visible change must add a concise entry to the `Unreleased` section
of `CHANGELOG.md` in the same change set. Write from the player's or
administrator's perspective and group entries under Added, Changed, Fixed, or
Removed.

Release notes should explain observable behavior, not internal implementation.
Record operational details separately when they matter for deployment, such as:

- database migrations and whether they are additive or destructive;
- backfill or catalog synchronization behavior;
- compatibility and rollback constraints;
- changes to authentication, email, permissions, or stored user data;
- configuration or manual production steps.

## Production-data rules

- Assume production always contains existing users, groups, invitations,
  attempts, mastery, achievements, feedback, and uploaded media.
- Never reset, reseed, truncate, or replace production with development data.
- Prefer forward-only, additive migrations. Any destructive or irreversible
  operation requires explicit approval and a tested recovery plan.
- Take and verify protected backups before database or catalog mutation.
- Compare protected row counts before and after migrations. Document every
  expected count change and stop on any unexplained difference.
- Keep the previous application release available for rollback. Account for
  database compatibility before rolling application code back.
- Test upgrades against representative existing-user state, not only newly
  created accounts.
- Taxonomy releases may rebuild derived subtopic mastery from existing attempts,
  but must not delete or rewrite those attempts, scores, feedback records, or
  editorial history.

## In-app update history and version

Player-facing release notes live in `content/releases.json`, newest first. The
first entry must match the version in `package.json`; `src/lib/app-version.ts`
uses that package value for every visible application-version label. The build
runs `npm run release:verify` and fails if package metadata, the release history,
and the dated changelog release disagree.

Mindspan records two independent values for each player:

- `last_app_version` controls the one-time **Mindspan was updated** summary;
- `last_updates_read_version` controls which releases are highlighted on the
  **Updates** page.

New players are silently initialized to the version they first use rather than
being shown the full historical update backlog. Existing beta users are
baselined at `0.2.0-beta.5`, so the first notice they receive will describe the
release after that baseline. Administrator-only notes are filtered on the
server and are never sent to ordinary players.

Before preparing a release, count catalog changes since the production tag:

```powershell
npm run release:question-changes -- --from v0.2.0-beta.5
```

Copy the reported `added`, `revised`, and `retired` values into that release's
optional `questionChanges` object. Mindspan displays the summary when the total
is at least 10 changes.

Before that count, capture current development approvals with
`npm run catalog:reviews:capture`. If Question Quality review also occurred in
production, first download its latest action-items export and merge it with
`npm run catalog:reviews:capture -- <export-file>`. Commit the resulting
`content/catalog/editorial-approvals.json` with the catalog. The deployment
catalog load applies an approval only to an exact matching content fingerprint;
revised questions intentionally return to the unreviewed queue.

## Release checklist

1. Review every merged change since the current production tag.
2. Capture development approvals and merge the latest production Question
   Quality export into the portable editorial-approval ledger.
3. Confirm `CHANGELOG.md` accurately covers all user-visible changes.
4. Move completed Unreleased entries into a dated version section and remove
   empty headings from that released section.
5. Add the new entry to `content/releases.json`, update `package.json`, and run
   `npm run release:verify` to verify package, display, release-note, and
   changelog versions together.
6. Run lint, type checking, unit tests, production build, integration checks,
   and existing-user upgrade tests.
7. Document pending migrations, expected data changes, backup locations, and
   rollback compatibility before deployment.
8. Deploy the immutable release, verify health and restart persistence, then
   smoke-test the update display and visible version in production.
