# Phase 1 database migration preparation

**Status: PENDING DATABASE ADMINISTRATOR VERIFICATION.** This repository does not contain the stored Aiven `schema_migrations` checksum, a production schema export, or proof of which SQL bytes were run there. None of the prepared migrations is approved for production execution yet. The current frontend and backend continue to use the legacy columns.

## What was investigated

The sole committed version of `backend/migrations/001_initial_schema.sql` was introduced by commit `1bbe4a22a23ffa3cbc98b68b0fdcea7b354ffc60` on 2026-10-16. `git log --all --follow` shows no later edit to that file and no earlier committed version. Its SHA-256 (full UTF-8 bytes) is:

```text
cd4f1a594f7fe56f560d0854c389262d19b8014e2d40f0c22f11088a0bc22e99  001_initial_schema.sql
```

The historical checksum candidate at that commit is the **same** hash. There are no known historical content, seed-data, formatting, or line-ending differences in Git to compare. An uncommitted or manually edited SQL copy may have been used on Aiven; Git cannot establish that. Do not invent a second candidate from normalized line endings or guessed edits.

The migrator reads top-level `backend/migrations/NNN_*.sql` files and hashes every UTF-8 byte. An applied row with a non-null, different checksum stops `runMigrations`. Migration `001` itself inserts a `schema_migrations` row with a null checksum; the existing runner can adopt that null after checking table existence and a few seed counts. Those checks do **not** prove full schema or historical SQL equivalence. Do not run this adoption path against production until an administrator has resolved the evidence gap. `npm run db:status` reports a mismatch but does not fail the process; `npm run db:check` checks whether `001` is applied and basic table/seed readiness, not checksum equality. Compare the actual stored checksum explicitly.

`/api/v1/ready` checks DB connectivity, all discovered migration rows/checksums when `REQUIRE_LATEST_MIGRATION=true`, and 52 expected tables plus fixed seed counts. Render config sets that flag to `true`, so a checksum mismatch or pending active migration yields `503 NOT_READY`. The table-existence check is derived from `001`; it does not validate every new `002`–`004` column or FK. `/health`, authentication, and content routes do not use this readiness gate. A failed readiness check alone does not establish that those routes or the whole database are unavailable.

## Required read-only production evidence

In DBeaver, select the intended Aiven database and run [database-migration-preflight.sql](database-migration-preflight.sql). Keep raw outputs within the administrator's secure workspace. The script reports the database version, migration history, table/column/index/FK metadata, account code mappings, account counts, URL quality, duplicate URL hashes, five-account-limit exceptions, WhatsApp purchase-link candidates, and fingerprints of legacy rows. Do not paste credentials, tokens, unredacted account URLs, or customer data into an issue or chat.

If metadata unexpectedly shows an existing `social_platforms` table before `002`, treat that as possible prior partial work. Inspect its rows with this additional **read-only** query, then stop for a reviewed schema comparison:

```sql
SELECT id, platform_code, name, icon_key, sort_order
FROM social_platforms ORDER BY id;
```

The administrator must provide, at minimum, the `001` row's `version`, `name`, full `checksum`, and `applied_at`; whether that row is unique and non-null; the Aiven MySQL version; relevant `SHOW CREATE TABLE` or equivalent metadata for `schema_migrations`, `social_links`, `product_purchase_links`, `product_variants`, and `media_assets`; and any original SQL file or deployment artifact that created the schema. Compare all 52 expected tables, the fixed seed counts, and relevant columns/indexes/FKs before asserting schema equivalence. Query the full table list because the current health check tests existence, not every column definition. Keep the original evidence and reviewer decision in the change record.

### Decision tree for migration 001

1. **Stored checksum matches `cd4f…`**: confirm the complete value, file name, and schema metadata. The reported mismatch may come from another Render revision, another database, or a past modified file; investigate before clearing the incident. No checksum rewrite is needed. Evaluate any schema drift separately and repair it only with a reviewed forward migration.
2. **Stored checksum matches a verified historical SQL artifact outside Git**: retain both the original artifact and its hash, compare its DDL and seeds with current `001`, and obtain administrator review. If there are schema differences, prepare a separate forward corrective migration. Do not change `001` or overwrite the stored hash merely to make the current runner pass. A future reviewed migration-runner compatibility decision may be needed to recognize the verified historical hash while retaining its integrity check.
3. **Stored checksum matches no verified artifact**: the applied SQL is unidentified. Stop before activating or executing `002`–`004`. Obtain the original SQL/deployment record or a full independently reviewed schema and seed comparison. Never manufacture a matching migration or clear the checksum.
4. **Schema appears equivalent but checksum differs**: matching table structures do not prove identical SQL bytes, data seeds, migration order, or side effects. Preserve the mismatch and request the original artifact plus an attested comparison. Do not treat `schema_migrations.checksum = NULL` or a manual update to the current hash as reconciliation.
5. **Production schema differs from the repository**: record each difference and its data/constraint impact. Prepare forward-only corrections and rehearse them on a restored copy. Do not rebuild or reset production tables to mimic `001`.

Until the evidence and an approved reconciliation approach exist, **both production execution paths below are blocked**. In particular, do not run `npm run db:migrate` on Aiven: with the known mismatch it stops, and with a null `001` checksum its limited adoption checks could misrepresent history.

## Prepared schema files and compatibility

The SQL is staged under `backend/migrations/prepared/`:

| Order | File | Additions | Existing behavior |
| --- | --- | --- | --- |
| 002 | `002_social_platforms_and_accounts.sql` | `social_platforms`; nullable `social_links.platform_id` and `description`; platform/count index and restrictive FK; reviewed-code backfill | Keeps account IDs, codes, labels, URLs, icon keys, active flags, ordering, and timestamps. The existing unique `platform_code` remains. |
| 003 | `003_product_social_account_reference.sql` | Nullable `product_purchase_links.social_link_id`, index, restrictive FK to `social_links` | Keeps existing URL, store name, button label, and every purchase link. No guessed WhatsApp assignment. |
| 004 | `004_product_variant_media.sql` | Nullable `product_variants.media_id`, index, FK to `media_assets` with `ON DELETE SET NULL` | Existing variants remain valid without an image. The FK covers physical deletion; Phase 2 must protect media soft-deletion in application logic. |

Reviewed-file SHA-256 values (recalculate after any approved edit and before execution):

```text
cc55daac16f5f80fb8b764dfda8ebe9ad95283f82065394e7c04d47462f4aa94  002_social_platforms_and_accounts.sql
84cf8bd038a170725817961da70b30b7e7417f5a4f69ae31e7a1d17ee7384b92  003_product_social_account_reference.sql
523696cd4e3689486f7c9dbf2d5d102ca4ca67388ca5df10e40ae9b4d5fcef5b  004_product_variant_media.sql
```

The staged directory is deliberate: `migrationFiles()` reads only the **top-level** `backend/migrations` directory, so these files are not active migrations and do not add pending rows to production readiness merely by being deployed. No repository build/start/CI command runs `db:migrate`: Render builds and starts Node, CI runs code checks, and Kroombox hosts the frontend. The administrator must also verify that no extra pre-deploy or release command was configured outside the repository in the Render/Kroombox dashboards. Render may auto-deploy repository changes; the staging location prevents these SQL files from being executed or counted as pending by that deployment. A later approved release must promote the exact reviewed files to the top-level directory in order `002`, `003`, `004`, coordinate migration execution before deploying that active release, and verify checksums. Do not edit file bytes after execution.

The starter platform catalog is Instagram, WhatsApp, YouTube, LinkedIn, TikTok, Facebook, X, GitHub, Pinterest, Threads, Discord, and Telegram. It inserts **platform types only**, never Uni-Inside account URLs. All corresponding `react-icons/si` brand components were checked against the installed package except LinkedIn, for which the current app has `FaLinkedinIn` from `react-icons/fa6`; a later curated icon registry must use these verified mappings. A database row alone does not make a platform selectable in the future CMS.

Migration `002` maps the five legacy seed codes (`instagram_studio`, `instagram_craft`, `tiktok_studio`, `tiktok_craft`, `linkedin`) and an existing exact `whatsapp` code if present. An unfamiliar code triggers a SQL guard before any permanent DDL. The backfill changes only `platform_id` and explicitly preserves `updated_at`. A second guard rejects unmapped accounts. The administrator must review unknown codes, invalid URLs, duplicate URL candidates, and any platform with more than five accounts; no account is deleted, deactivated, or arbitrarily assigned. The future five-account cap belongs in a concurrency-safe backend service, not a trigger. The existing backend's legacy social-link, global WhatsApp, purchase-link, product variant, and footer queries continue to read their old columns. No API payload or CMS field changes in Phase 1.

## Backup and controlled execution — future administrator action

Before **any** production DDL, reconcile `001`; confirm Aiven MySQL 8.0.16+ with the required `utf8mb4_0900_ai_ci` collation and CHECK enforcement; resolve unknown social codes; inspect all existing indexes/FKs for name conflicts or prior partial execution; and compare the preflight counts and fingerprints. Arrange a maintenance window that pauses writes to `social_links`, purchase links, and variants during the migration and verification. Create and identify a verified Aiven backup/snapshot or a consistent encrypted export with schema, data, routines, and triggers. Test a restore to an isolated instance, record its timestamp and retention, and ensure that the recovery point is usable. Do not store backup contents in Git.

**Path A — official runner (recommended after reconciliation).** In a reviewed release checkout, promote the three exact SQL files from `prepared/` to the top-level migration directory. Pin the commit and compute each SHA-256. Confirm `db:status` against the intended database and make sure the verified `001` history is compatible with the runner. Rehearse on a restored copy. From an authorized operator environment, run `npm run db:migrate` exactly once. The runner uses an advisory lock and records a checksum after executing each file; inspect each row and run [database-migration-verification.sql](database-migration-verification.sql). Coordinate promotion so Render does not deploy the active files while their rows are still pending (`REQUIRE_LATEST_MIGRATION=true`). Do not disable readiness or integrity checks. If migration 001 cannot be reconciled with the runner, stop; do not bypass it.

**Path B — supervised DBeaver.** Use only after the same evidence, backup, and rehearsal. Disable any **continue on error** option and confirm the SQL-script executor stops at the first failed statement; otherwise the unknown-code guard cannot protect the later DDL. Execute the reviewed `002`, then verify `002`; execute `003`, verify it; then `004`, verify it. Use DBeaver's SQL-script execution mode against the confirmed database, and retain output and change ticket. Manual execution does **not** update `schema_migrations`. For each successfully applied file, a second reviewer must verify the exact file bytes/hash, schema effects, account preservation, and absence of an existing version row before the administrator records **one** authoritative `version`/`name`/checksum row through a separately reviewed change procedure. Never insert a history row for failed or partially applied SQL. Do not subsequently run the official runner over manually applied but unrecorded DDL: it will attempt the same migration again. Promote the exact same SQL bytes to the active directory only in a coordinated release after the history rows are verified.

MySQL `CREATE TABLE` and `ALTER TABLE` commit independently; `ROLLBACK` cannot reliably undo them. If a statement fails, **stop**. Record which statements succeeded using `information_schema` and the verification queries, compare row hashes/counts, and keep the application on the last compatible version. Choose either a reviewed compensating forward migration or restore from the verified backup under an administrator incident procedure. Do not rerun the entire file, reset Aiven, remove migration rows, null checksums, or blindly reapply `ALTER TABLE`. Restrictive FKs in `002`/`003` protect referenced platform/account rows from physical deletion; the optional media FK in `004` sets a variant reference to null only on physical media deletion. Phase 2 must handle disabling accounts, URL validity, WhatsApp account type, and media soft-deletion in business logic.

Local rehearsal used **disposable MySQL 8.4.11 databases only**, then removed them. The original `001` and staged `002`–`004` executed through SQL script mode and through a disposable copy of the official runner; a second runner pass found matching checksums without reapplying DDL. The preflight/verification row fingerprints matched for six seeded accounts, one purchase link, and one variant. An unknown account code stopped `002` before permanent DDL. A referenced social account could not be physically deleted, while physical media deletion set the optional variant reference to null. These results validate the prepared SQL against the local schema; they do not establish Aiven's schema or migration history.

## After each future migration

Run [database-migration-verification.sql](database-migration-verification.sql) and compare the three table counts and **every** ID/legacy-row hash to preflight. Confirm platform mapping, zero orphan references, expected nullable fields, all named indexes/FKs and their delete rules, unchanged purchase URLs, and distinct `schema_migrations` versions with checksums exactly matching the promoted files. Investigate every exception, including any null `social_links.platform_id` from a concurrent legacy write. Check `/ready` only after all active migrations and integrity checks are complete; continue monitoring normal CMS and public endpoints. Passing `/ready` is necessary but does not replace data comparisons.

## Administrator checklist

1. Run the read-only preflight SQL in DBeaver; obtain and retain the original migration `001` evidence and stored checksum.
2. Resolve the checksum case above with a second reviewer. **Stop here** if the applied SQL remains unidentified or the production schema differs without a reviewed correction.
3. Resolve unknown account codes and any existing partial schema; verify MySQL version, backup/snapshot, and test restore.
4. Rehearse `002` → `003` → `004` on an isolated restored database; compare counts and row fingerprints.
5. Approve one execution path and coordinate the active-file release with Render readiness.
6. Execute one migration at a time, verify it, and record exactly one authentic history row per applied file.
7. Run the read-only verification SQL and check `/ready`, CMS editing, and public content before closing the change.
