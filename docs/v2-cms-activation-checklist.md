# V2 CMS activation and verification

The owner-supplied 2026-11-09 Aiven export contains 63 MySQL 8.4 tables. The same dump passed the backend V2 structure checks on local MySQL 8.4. This is evidence about the dump, not a live Kroombox connection. Production now activates the structurally guarded V2 editors even when an old hosting template sets their flags to `false`; `render.yaml` does not configure Kroombox.

| CMS area | Dump evidence | Editor behavior after deployment |
| --- | --- | --- |
| Secondary Products, Services, News, Media Kit | Four `page_settings` rows and the typed `secondary_page_content_slots` table with PK, FKs, unique key, and two enforced named CHECKs | Extra text and Product banner slots are editable; missing slots are created on save. The readiness gate checks the actual named constraints. |
| Hero line 3 | `hero_settings.heading_line_3` exists and contains saved text in the latest export | Field opens when the connected database has the column; saved text is returned to the editor. |
| About Us editorial | Eleven scalar columns exist but are `NULL`; mission, tag, and collaborator rows are empty | Fields open as an empty draft. A complete valid CMS save initializes scalar fields and three mission points. Public copy stays on its current fallback until that save. No default text is written to the database. |
| Homepage News selection | Singleton exists in `latest` mode; no manual placements | Latest/manual controls open. Manual selection still requires published articles. Popular ranking remains unavailable because its source and ordering contract are absent. |
| Contact and Footer | Placement tables, Craft URL, and Maps URL columns exist; placements are empty | Controls open. Choosing a social account requires an active registered account; an empty optional placement list is valid. |
| Social Media and Product media | Twelve platform codes, five mapped active links, and the variant media column/FK exist | Account and variant-media editors open, subject to their existing asset and reference validation. |
| Team template | `team_section_settings.card_template_url` exists but is `NULL` | Authorized administrators can set a template; a template is not invented. |

`SECONDARY_PROJECTS_ENABLED`, `TEAM_MEMBERS_PUBLIC_ENABLED`, and `PARTNERS_PUBLIC_ENABLED` remain off. The dump has no `page_settings` singleton for Projects; managed Team and Partner public replacements also require approved content and behavior. These are separate from enabling supported CMS fields.

For production verification, check the Kroombox backend's deployed commit and connected database, then load an authorized admin session. `GET /api/v1/admin/secondary-pages/products` should report `capabilities.contentSlots=true` and `contentSlotsReason=null`; repeat for services, news, and media-kit. Check the Hero, About editorial, Homepage News, Contact, Footer, Social Media, Product variant, and Team template editors. Save one approved change, reload its editor, and inspect its public API/page. The About response is initially `enabled=true`, `initialized=false`, `reason=REFERENCE_DATA_PENDING`; that is an editable first-save state, and only a complete validated save changes it to initialized. Public responses may be cached up to 60 seconds.

If a supported capability remains disabled after deploying this change, verify that Kroombox runs the new backend build and points to the imported database. `DATABASE_MIGRATION_PENDING` means the connected database failed that feature's structural gate. Use [the read-only verification SQL](../backend/migrations/manual-reconciliation/04_verify_v2_cms_activation.sql) for structural details. No production API or Kroombox database connection was available to this repository run, so live activation and save/reload still require observation after deployment.

The export lists only migration `001` in `schema_migrations`. That ledger discrepancy is separate from V2 editor readiness. Do not replay overlapping DDL or insert ledger rows without reconciling the exact migration scripts and checksums. The supported editors still refuse operations if their live schema checks fail.
