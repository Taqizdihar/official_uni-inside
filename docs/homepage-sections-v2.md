# Homepage CMS V2 handoff

> V2 update (26 October 2026): Contact placement/Craft and Homepage News latest/manual selection now have guarded persistence and public paths, with `CONTACT_PLACEMENTS_ENABLED=false` and `HOMEPAGE_NEWS_SELECTION_ENABLED=false` by default. Popular remains disabled. The paragraphs below describe the earlier preview state; see [the current handoff](aiven-v2-integration.md).

Five sidebar destinations now open dedicated Contact Us, Achievements, News, Services, and Products pages. The fixed forms save only approved columns. The existing public ScrollStory, telephone physics, and Services carousel remain in place. Product heading artwork stays locked and renders the Crafts logo regardless of a legacy `homepage_section_settings.heading` value.

| Page | Persisted fields and code-point limits | Storage |
| --- | --- | --- |
| Contact Us | Heading 10; sub-heading 50 | `contact_section_settings.heading`, `description` |
| Achievements | Heading 12; subtitle 65 | `achievement_section_settings.heading`, `description` |
| News | Heading 15; CTA label 15; CTA URL; subtitle 50 | `homepage_section_settings` row `news` |
| Services | Heading 12; CTA label 20; CTA URL | `homepage_section_settings` row `services` |
| Products | Subtitle 50; CTA label 20; CTA URL. The `OUR PRODUCTS` heading is read-only. | `homepage_section_settings` row `products`; heading untouched |

The form and API preserve an unchanged legacy value above a new limit, including the seeded 76-character News subtitle. Once edited, the relevant limit applies. All five PATCH endpoints use strict payloads, transactions, audit logs, and content revisions. Generic write and revision-restore paths for these fixed settings return a controlled conflict; legacy reads still work. `homepage.view` and `homepage.update` govern fixed settings.

Achievements reuse the existing `achievements` table and generic authenticated record API for create, edit, publish, and soft delete. The dedicated page provides a modal editor, Media Library picker in the Halaman Utama group, status display, drag ordering, move buttons, save, and undo. Record CRUD continues to enforce `achievements.*` permissions; published edits require publisher permission. `PUT /admin/achievements/order` checks the complete list, uniqueness, permissions, and the previously observed order under row locks before assigning positions in one transaction. Public data contains only published, nondeleted records. The public section loads bounded pages of 100, scrolls horizontally with snap points and arrows, and opens an accessible detail dialog with focus restoration. There is no public Achievement detail route.

The Contact social selector lists active accounts from Social Media V2 when available, or recognized active legacy accounts otherwise. It permits eight distinct account IDs, only one WhatsApp, and independent local ordering. The Craft URL is a separate optional local preview. **Selections and Craft URL do not persist yet.** Backend capabilities report `contactSocialPlacements=false` and `contactCraftUrl=false`, and do not query missing placement storage. The public Contact row retains the published static links until an approved mapping is activated. WhatsApp is leftmost and remains expanded while other icon buttons expand on hover or focus; Craft remains last. The telephone, audio, and rope behavior are untouched.

The News page saves copy and CTA only. Its manual Article picker searches a bounded set of 20 published records per query, filters category, allows four unique IDs and local reordering. **The selected IDs and mode do not persist yet.** `homepageNewsSelection=false` and `homepageNewsPopularity=false`. The public section currently shows up to four newest eligible published articles by `published_at DESC, id DESC`; scheduled, archived, deleted, and draft content is excluded. Popular is disabled. The `news_view` event and `analytics_daily_metrics` table exist, but the production rollup schedule and 30-day completeness have not been confirmed, so no popularity is claimed.

The reusable CMS button destination selector reads `GET /admin/link-destinations`, a curated server manifest checked against actual public routes and Homepage IDs. It is used in Hero, the three CTA-bearing Homepage pages, and other generic CTA URL fields. Choices include `/`, `/products`, `/services`, `/news`, `/projects`, `/media-kit`, `/tools`, `/tools/prompt-gallery`, and verified Homepage anchors. CMS paths and unresolved detail templates are excluded. Input Manual preserves existing custom URLs; changed fixed-section destinations require a safe relative path or credential-free HTTPS URL. Public CTA links use SPA routing for internal paths, safe external anchors, and `cta_click` analytics. Social-account, purchase, media, map, and reference URL controls are separate.

## Database activation handoff

| Capability | Current state | Proposed additive change and activation |
| --- | --- | --- |
| Five fixed section forms | Existing columns | Deploy API and frontend; no schema change. |
| Achievement CRUD and order | Existing `achievements` table | No schema change. Audit live sort ties before relying on prior order for concurrent edits. |
| Contact social placements | Disabled | After Social Media V2/002 is confirmed, propose `contact_social_placements` with its own primary key, `social_link_id` foreign key, unique reference, and unique position. Enforce maximum eight and active/unsupported account rules in transactions. Rehearse inactive/deletion behavior and only then enable a guarded read/write path. |
| Contact Craft URL | Disabled | Propose nullable `contact_section_settings.craft_url VARCHAR(1000)` with safe URL validation. Activate together with Contact placement after approved migration and data review. |
| News selection | Disabled | Propose a singleton News selection mode and a `homepage_news_article_placements` table with primary key, unique article reference and position. Validate only eligible published articles and define soft-delete handling. Backfill reviewed selections, then activate guarded read/write/public routing. |
| News popularity | Disabled | Verify `news_view` event collection, daily rollup schedule, and completeness; rank positive 30-day views joined to currently eligible articles with deterministic tie breaks. Activate only with a persisted mode and verified monitoring. |

The database team owns historical migration 001, checksum reconciliation, and prepared 002–004. This implementation neither edits those migrations nor runs any production Aiven operation. Contact and News placement proposals require separate review, additive migration rehearsal, deployment order, readiness checks, and explicit activation. A draft form must never report a placement as saved before that work is complete.

Validation for this handoff is recorded in the associated commit and CI results. Run frontend TypeScript checks, unit tests, and build; backend typecheck, lint, tests, OpenAPI check, and build. No production database CRUD or migration test is part of this change.
