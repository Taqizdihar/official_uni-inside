# Secondary Pages CMS and Homepage visual refinement

The logo rollback restores both complex-logo files exactly from dae65a65d24f89580ba0ed7158267aefba0f41b2. A backup branch and stash retain the pre-reset state and unrelated database changes. A normal rollback commit preserves remote history; no force push is used.

## Editors and API

Canonical routes are /admin/secondary/{products,services,news,media-kit,projects}. Each renders one logical form, one supported draft, one Save/Discard pair, counters, field errors, loading/error/retry and viewer states, stale-version protection, and the existing route/browser dirty guard. Fixed panels reuse the current editorial controls. Legacy /admin/site/page-settings routes redirect; generic page-settings reads remain compatible, while writes and revision restoration are blocked by the shared content service. No SEO, sort, typography, artwork or arbitrary page-builder controls are exposed.

GET/PATCH /api/v1/admin/secondary-pages/{page} enforce authentication, settings.view/settings.update, CSRF for writes, fixed page keys and strict supported-field bodies. PATCH takes {edit, expectedVersion}; it locks existing rows, validates changed text and URLs, updates approved changed columns only and writes revisions/audit in the same transaction. SEO and hidden columns are never written. Pending fields are not accepted in the payload.

Products has Hero, Catalogue, and closing CTA panels. Services has Hero, Listing, and closing CTA panels; its scroll target stays #studio-offerings. News has Hero and Archive panels, with no duplicate archive selection workflow. Media Kit has exactly seven panels including two fixed workspace descriptions, three fixed capability pairs, and two internal Identity/Typography groups. MEDIA KIT, official logos/downloads, fixed navigation destinations, color values and fonts stay restricted. Projects compiles as a prepared, disabled form with a server-enforced gate.

| Page | Field/feature | Existing schema | Missing storage | Runtime status | Migration requirement |
|---|---|---|---|---|---|
| Products | `heading` — Heading utama, 30 | `page_settings.heading` | None | Persisted | None |
| Products | `accent` — Heading aksen, 25 | None with matching meaning | Fixed text slot `accent` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Products | `description` — Deskripsi Hero, 220 | `page_settings.description` | None | Persisted | None |
| Products | `listing_heading` — Heading katalog, 35 | None with matching meaning | Fixed text slot `listing_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Products | `cta_heading` — Heading, 60 | None with matching meaning | Fixed text slot `cta_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Products | `cta_description` — Deskripsi, 200 | None with matching meaning | Fixed text slot `cta_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Products | `cta_label` — Label tombol, 25 | `page_settings.primary_cta_label` | None | Persisted | None |
| Products | `cta_url` — Tujuan tombol, 1000 | `page_settings.primary_cta_url` | None | Persisted | None |
| Services | `heading` — Heading utama, 30 | `page_settings.heading` | None | Persisted | None |
| Services | `accent` — Heading aksen, 30 | None with matching meaning | Fixed text slot `accent` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Services | `description` — Deskripsi Hero, 220 | `page_settings.description` | None | Persisted | None |
| Services | `scroll_label` — Label tombol scroll, 25 | None with matching meaning | Fixed text slot `scroll_label` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Services | `listing_heading` — Heading daftar, 35 | None with matching meaning | Fixed text slot `listing_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Services | `cta_heading` — Heading, 65 | None with matching meaning | Fixed text slot `cta_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Services | `cta_description` — Deskripsi, 200 | None with matching meaning | Fixed text slot `cta_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Services | `cta_label` — Label tombol, 25 | `page_settings.primary_cta_label` | None | Persisted | None |
| Services | `cta_url` — Tujuan tombol, 1000 | `page_settings.primary_cta_url` | None | Persisted | None |
| News | `heading` — Heading utama, 45 | `page_settings.heading` | None | Persisted | None |
| News | `description` — Deskripsi Hero, 120 | `page_settings.description` | None | Persisted | None |
| News | `archive_heading` — Heading arsip, 35 | None with matching meaning | Fixed text slot `archive_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| News | `sidebar_heading` — Heading sidebar, 25 | None with matching meaning | Fixed text slot `sidebar_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `tagline` — Tagline, 60 | None with matching meaning | Fixed text slot `tagline` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `description` — Deskripsi Hero, 220 | `page_settings.description` | None | Persisted | None |
| Media Kit | `explore_label` — Label tombol utama, 25 | None with matching meaning | Fixed text slot `explore_label` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `download_label` — Label tombol kedua, 25 | None with matching meaning | Fixed text slot `download_label` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `brand_heading` — Heading, 60 | None with matching meaning | Fixed text slot `brand_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `brand_description` — Deskripsi, 250 | None with matching meaning | Fixed text slot `brand_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `brand_support` — Paragraf pendukung, 250 | None with matching meaning | Fixed text slot `brand_support` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `workspaces_heading` — Heading bagian, 60 | None with matching meaning | Fixed text slot `workspaces_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `workspaces_description` — Deskripsi bagian, 180 | None with matching meaning | Fixed text slot `workspaces_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `studio_description` — Deskripsi Studio, 220 | None with matching meaning | Fixed text slot `studio_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `craft_description` — Deskripsi Craft, 220 | None with matching meaning | Fixed text slot `craft_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `capabilities_heading` — Heading bagian, 60 | None with matching meaning | Fixed text slot `capabilities_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `capabilities_description` — Deskripsi bagian, 180 | None with matching meaning | Fixed text slot `capabilities_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `capability_1_heading` — Heading kartu 1, 35 | None with matching meaning | Fixed text slot `capability_1_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `capability_1_description` — Deskripsi kartu 1, 120 | None with matching meaning | Fixed text slot `capability_1_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `capability_2_heading` — Heading kartu 2, 35 | None with matching meaning | Fixed text slot `capability_2_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `capability_2_description` — Deskripsi kartu 2, 120 | None with matching meaning | Fixed text slot `capability_2_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `capability_3_heading` — Heading kartu 3, 35 | None with matching meaning | Fixed text slot `capability_3_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `capability_3_description` — Deskripsi kartu 3, 120 | None with matching meaning | Fixed text slot `capability_3_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `identity_heading` — Visual Identity — Heading, 60 | None with matching meaning | Fixed text slot `identity_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `identity_description` — Visual Identity — Deskripsi, 180 | None with matching meaning | Fixed text slot `identity_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `typography_heading` — Typography — Heading, 60 | None with matching meaning | Fixed text slot `typography_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `typography_description` — Typography — Deskripsi, 220 | None with matching meaning | Fixed text slot `typography_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `logos_heading` — Heading, 50 | None with matching meaning | Fixed text slot `logos_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `logos_description` — Panduan penggunaan logo, 300 | None with matching meaning | Fixed text slot `logos_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `contact_heading` — Heading, 70 | None with matching meaning | Fixed text slot `contact_heading` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Media Kit | `contact_description` — Deskripsi, 200 | None with matching meaning | Fixed text slot `contact_description` | Read-only pending | Add slot, reviewed backfill, gated read/write activation |
| Projects | `heading` — Heading utama, 25 | `page_settings.heading` | Approved Projects singleton | Prepared, disabled | Reviewed singleton + activation |
| Projects | `description` — Deskripsi pengantar, 160 optional | `page_settings.description` | Approved Projects singleton | Prepared, disabled | Reviewed singleton + activation |
| Products | Banner mode and media reference | Published Product images supply automatic mode | Fixed `banner_mode` and `banner_media_id` slots | Automatic only; manual disabled | Mode enum + media FK and section validation |

## Public integration and compatibility

Products/Services consume stored heading, description and closing CTA label/destination through the public site response. News consumes stored heading/description. Media Kit consumes its matching stored description and Footer email. Pending fields retain their existing source text; they never use a local preview as public content. Automatic product artwork, product/service/news lists, eligibility, featured policy, categories, pagination and detail links are unchanged. Missing public data uses current source fallbacks; legacy over-limit stored text is not truncated. Design-preview routes retain sample copy. No new public detail routes or restricted artwork selectors are added.

## Navigation

Halaman Lanjutan is Products, Services, News, Media Kit, then a non-link Projects item labelled Belum diaktifkan. News is separate from Homepage News. Uni-Tools is removed only from the CMS menu; public /tools and /tools/prompt-gallery remain intact. Existing Project post management remains at /admin/content/projects and moves to Postingan → Proyek so it stays reachable.

## Homepage visual changes

News modes use responsive native-radio cards with descriptions, selection/focus states and a disabled Popular option. Search/filter tools, thumbnails, dates/categories, max-four selection and ordered controls retain their existing logic. Contact has distinct Pick Accounts, Selected Accounts and Craft groups, readable labels, branded platform icons, selection states and keyboard focus. Maximum eight, one WhatsApp pinned left, active account eligibility and separate Craft placement remain preview-only. Achievement modals retain their handlers and fields with deliberate width, two readable information grids, full-width description/media regions and aligned actions. Management rows and reorder controls wrap on mobile. Scoped typography and counter refinements cover Hero, About/Team and the five Homepage section editors.

## Readiness and next actions

See [database requirements](cms-pending-database-requirements.md#secondary-pages-cms) for schema design, exact slot matrix, Projects readiness and documentation-only future translation cache. No production SQL, schema/checksum edits, credentials, hosting configuration, production API override or translation service changes occur. Missing slots require reviewed additive storage, source-copy backfill, schema-ready API read/write/public integration and explicit activation approval. Manual banner selection remains disabled until those requirements exist; its prepared picker is selection-only, scoped to Halaman Lanjutan and does not upload or edit Product records.

## Validation

Automated checks cover limits across every approved persisted/pending field, Unicode, unchanged legacy copy, strict payloads, unsafe URLs, server permissions/CSRF, atomic audit/revision rollback, stale versions, disabled Projects with no missing-storage queries, generic-write prevention, public resolvers, Footer email and canonical breadcrumbs. Browser findings and final command results are appended after verification. Tests use isolated fixtures and mocked browser responses, not production Aiven.

## Verified results — 25 October 2026 (Asia/Jakarta)

Clean npm ci passed for frontend and backend. Frontend npm run lint (TypeScript), 56 tests and Vite production build passed. Backend typecheck, ESLint, 188 tests, production build and OpenAPI validation (77 paths) passed. No tests were skipped. Vite emitted a chunk-size advisory; the build succeeded. Backend tests use isolated database fixtures and do not establish production MySQL connectivity.

Chromium checked all five secondary editors and all eight Homepage editors at 1440, 1024, 768, 390 and 320 pixels without horizontal overflow. It verified one secondary form per page, panel counts, pending disabled inputs, no SEO controls, sidebar order, non-link Projects, viewer mode, supported-only save payloads, exact heading boundary, discard, API-error recovery preserving drafts and legacy redirects across site/content/homepage paths. News manual selection retained four items with Popular disabled. Contact retained eight accounts, at most one WhatsApp pinned left, and a distinct Craft region. Achievement creation and keyboard ordering produced the existing contracts. Public Products/Services/News rendered stored headings, Media Kit rendered stored description/shared Footer email and retained official logo downloads. No browser page errors occurred.

Actual screenshot review covered the News mode cards/article grid, Contact account grid and selected WhatsApp, Contact mobile wrapping, the wider Achievement dialog, and the secondary Products closing panel. During review, the account options needed explicit scrolling containment to prevent overlap into Craft; this was fixed and the full interaction pass then succeeded. News filters and choices now have aligned outlined controls and clear selection depth. Achievement information fields have balanced widths; description/media are full-width with safe dialog scrolling. Screenshot artifacts were exported under /workspace/artifacts/secondary-pages in the execution workspace. These mocked browser runs do not establish pixel-perfect agreement with unavailable original screenshot files or verify production deployments.

The complex-logo files match dae65a65d24f89580ba0ed7158267aefba0f41b2 exactly. Existing pointer parallax is restored; the viewport exploded-parts animation is removed. The original database reconciliation changes, including untracked SQL handoff files, are preserved outside this delivery. No production mutation, feature activation, migration checksum edit, translation provider request or hosting/API-override change was performed.

## Complete delivery file list

The rollback changes the two complex-logo files. The implementation changes the following files; the list excludes preserved database-workflow files.

- `backend/.env.example`
- `backend/docs/openapi.yaml`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/contracts/secondaryPages.ts`
- `backend/src/routes/secondaryPages.ts`
- `backend/src/services/content.ts`
- `backend/src/services/secondaryPages.ts`
- `backend/tests/secondary-pages.test.ts`
- `docs/cms-pending-database-requirements.md`
- `docs/secondary-pages-cms.md`
- `src/admin/AdminApp.tsx`
- `src/admin/about-team/EditorControls.tsx`
- `src/admin/breadcrumbs.ts`
- `src/admin/layouts/CmsLayout.tsx`
- `src/admin/pages/AchievementsManagement.tsx`
- `src/admin/pages/HomepagePlacementPreviews.tsx`
- `src/admin/pages/SecondaryPageSettings.tsx`
- `src/admin/pages/about-team.css`
- `src/admin/pages/hero-settings.css`
- `src/admin/pages/homepage-sections.css`
- `src/admin/secondary/secondary.css`
- `src/components/about/AboutComplexLogoParallax.module.css`
- `src/components/about/AboutComplexLogoParallax.tsx`
- `src/pages/MediaKitPage.tsx`
- `src/pages/NewsPage.tsx`
- `src/pages/ProductsPage.tsx`
- `src/pages/ServicesPage.tsx`
- `src/public/secondaryPageModel.ts`
- `src/public/secondaryPages.ts`
- `tests/secondary-pages.test.ts`
