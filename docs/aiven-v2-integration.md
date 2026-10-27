# Aiven V2 integration and reconciliation handoff

This repository prepares the backend and CMS for the owner's externally executed consolidated V2 migration. No code in this delivery connects to or changes production Aiven. The exact SQL executed in DBeaver and a current post-V2 structural export were not supplied to this workspace. The reported totals (63 tables, 63 primary keys, 71 CHECK constraints) alone cannot prove object-by-object equivalence to the repository's prepared 002–004 files or validate ledger registration. Migration-history registration therefore remains **BLOCKED — ADDITIONAL EVIDENCE REQUIRED**.

## Evidence and execution order

1. In DBeaver on the intended Aiven database, run [01_verify_aiven_v2_schema.sql](../backend/migrations/manual-reconciliation/01_verify_aiven_v2_schema.sql). Export every result set, including `schema_migrations`, table/column/key/constraint definitions, seed and reference counts, and any data anomalies. This script only reads metadata and data.
2. Obtain the exact consolidated V2 SQL that was executed, or a trusted post-V2 `SHOW CREATE TABLE`/constraint export. Compare each 002/003/004 operation with its actual counterpart, including nullable rules, keys, foreign keys, seed rows, backfill, and data state. A matching count is insufficient. Preserve the historical 001 ledger row; its original checksum is `1af04aa15d82825ff80c3ecc5ba619e1e9f2956e7fa68fb30fedcbcee1119ea2` and its reviewed source checksum is `cd4f1a594f7fe56f560d0854c389262d19b8014e2d40f0c22f11088a0bc22e99`.
3. [02_reconcile_migration_history.sql](../backend/migrations/manual-reconciliation/02_reconcile_migration_history.sql) deliberately contains **no DML**. Do not register 002–004 or run a backfill from guessed V2 equivalence. Once the executed SQL and structural evidence are reviewed, prepare a new narrow ledger transaction with exact approved checksums and duplicate checks, then have the database owner run it. Do not replay DDL already executed.
4. Run [03_verify_migration_reconciliation.sql](../backend/migrations/manual-reconciliation/03_verify_migration_reconciliation.sql) after any owner-executed reconciliation. Confirm all ledger rows, checksums, 001 compatibility, seeds and references, and then check the backend `/ready` response. Until step 3 actually occurs and is verified, the ledger remains unreconciled.

The prepared file checksums in script 02 are comparison values, not proof that the externally executed SQL was byte-identical. The live migration runner accepts only the reviewed 001 historical checksum when the expected original tables, fixed seeds, and named CHECK, foreign-key and unique constraints are present. It does not infer or register an external V2 migration. An unknown checksum fails explicitly. `/ready` reports pending external reconciliation states separately; feature gates default off.

An earlier, uncommitted Aiven-compatibility edit to prepared 002 exists in the shared workspace and is deliberately excluded from this commit. Its hash differs from the committed prepared 002 hash listed in script 02. The 002 file on remote main still requires review before any standalone execution; this delivery does not advise replaying it on the already migrated database.

## Activation matrix

“Schema unknown” means the actual post-V2 objects have not been verified in this workspace. “Prepared” means source and isolated tests exist, not that production has been activated. All listed new flags default to `false` in `backend/.env.example`.

| Module | Schema available | Backend ready | CMS ready | Public ready | Activation status |
| --- | --- | --- | --- | --- | --- |
| Social Media registry | Unknown; prepared 002 reviewed locally | Existing guarded CRUD and reference checks | Existing dedicated account manager | Product references guarded | `SOCIAL_MEDIA_V2_ENABLED=false` pending V2 object/seed audit |
| Product purchase account and variant media | Unknown; prepared 003/004 reviewed locally | Existing guarded save/read/media checks | Existing Product selectors | Existing Product detail path | `SOCIAL_MEDIA_V2_ENABLED=false`, `PRODUCT_VARIANT_MEDIA_ENABLED=false` |
| Hero third heading line | Unknown | Existing bounded fixed-slot path | Existing editor | Existing Hero projection | `HERO_THREE_LINE_ENABLED=false` until column/backfill review |
| Homepage Contact | Unknown | Guarded transaction, active-account and URL checks | Saved selector and Craft control when ready | Stored order/Craft with legacy fallback | `CONTACT_PLACEMENTS_ENABLED=false` pending structure/reference review |
| Footer placements and Maps | Unknown | Guarded one-save transaction | Saved controls when ready | Ordered icons/validated Maps URL with existing fallback | `FOOTER_V2_ENABLED=false` pending structure/reference review |
| Homepage News | Unknown | Guarded latest/manual mode and max-four published IDs | Saved selector when ready; Popular disabled | Selected ordered cards or latest four | `HOMEPAGE_NEWS_SELECTION_ENABLED=false`; analytics ranking deferred |
| About editorial | Unknown | Guarded scalar/tag/mission/type transaction | Fields and ordered editors when ready | Stored copy with current fallback | `ABOUT_EDITORIAL_V2_ENABLED=false` pending reviewed backfill and structure |
| Team Canva template | Unknown | Role-restricted guarded update | Admin-only editor when ready | Not public | `TEAM_TEMPLATE_ENABLED=false` pending column review |
| Team personal social links | Unknown normalized table; four legacy columns available | Existing four validated personal profile fields | Existing four curated icons | Existing four per-member links | Additional normalized platforms deferred pending exact table contract |
| Products, Services, News, Media Kit secondary slots | Unknown | Guarded fixed slots and manual Product banner media | Fixed-page editor when ready | Slots with fallback | `SECONDARY_CONTENT_SLOTS_ENABLED=false` pending structure/media review |
| Projects secondary page | Singleton not verified | Prepared guarded editor | Disabled | Current Projects unchanged | `SECONDARY_PROJECTS_ENABLED=false` |
| Managed Team and Partners | Existing tables, collection data completeness unverified | Existing CRUD | Existing collection managers | Static collections retained | `TEAM_MEMBERS_PUBLIC_ENABLED=false`, `PARTNERS_PUBLIC_ENABLED=false` until complete reviewed replacement |
| Translation cache | Reportedly present, unverified | No translation service in scope | No CMS control | No change | Deferred |

The prepared optional services require explicit flags **and** structural checks before querying or writing V2 tables. An old deployment therefore continues using supported legacy paths. Flags should be enabled one at a time only after the database owner verifies the actual V2 schema, reference rows, and backfill; then perform an authorized CMS save/read and public read on the deployed stack. Backend fixture tests and mocked browser data cannot establish Aiven compatibility.

## Remaining compatibility questions

- Exact V2 table/column/constraint names and the final executed SQL are unavailable. The optional services use narrow expected shapes, and each refuses missing structures. They cannot guarantee readiness against an unseen schema.
- About scalar fields require reviewed non-null values; the three Mission rows must occupy slots 1–3. Empty tag or collaborator lists can be intentional after activation, so the explicit flag and owner review distinguish these from missing backfill.
- The normalized `team_member_social_links` table cannot safely replace the current four approved profile columns without its executed definition and migration of existing member URLs. Current individual links stay separate from Studio accounts and remain usable.
- Popular News requires verified analytics collection and a stable ranking window. No popularity result is claimed.
- No optional backfill SQL is executable from the available evidence. Existing live editorial content must be reviewed before drafting any owner-run update.

The older CMS feature documents describe the pre-V2 preview phase. This handoff records the guarded integration added afterward; it does not certify production activation.

For the current field-by-field readiness matrix, Secondary Page slot verification, and staged Render activation steps, use [the V2 CMS activation checklist](v2-cms-activation-checklist.md).
