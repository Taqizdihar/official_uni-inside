# Our Team and About Us CMS

> V2 update (26 October 2026): About editorial text/lists and the Canva template now have guarded persistence paths (`ABOUT_EDITORIAL_V2_ENABLED=false`, `TEAM_TEMPLATE_ENABLED=false` by default). Existing four individual Team profile fields remain in use; normalized V2 social-link storage awaits its exact schema contract. The preview-only descriptions below document the earlier state; see [the current handoff](aiven-v2-integration.md).

The canonical pages are `/admin/homepage/team-section-settings` and `/admin/homepage/about-settings`. Existing sidebar entries are reused. Old fixed-slot URLs redirect to these editors; generic Team/Partner CMS URLs open the corresponding dedicated page. Generic Team/Partner APIs remain available to legitimate clients. Generic About/Team fixed writes and revision restoration cannot bypass the new restricted-field contract.

## Fixed forms and current persistence

Our Team exposes only its Heading, maximum 15 Unicode code points. Its existing instructions, description, eyebrow, and default mode are preserved. The Canva helper opens `https://canva.link/kt3du8vvev19zrk` in a new tab and explains the required 1080 × 1350 px, 4:5 card artwork. Template storage remains unavailable. `PATCH /admin/homepage/team/template` explicitly rejects lower roles; a valid admin request returns a controlled pending-capability error. Ordinary `homepage.update` permission does not grant template editing.

About Us has exactly five major panels:

| Panel | Supported fields | Pending fields shown read-only |
| --- | --- | --- |
| ABOUT US | Subtitle 50; description 170 | One Highlight field 50 |
| OUR ECOSYSTEM | Heading 40; fixed Studio/Craft subtitle 30 and description 180 each | Eyebrow 30; intro 100; independent ordered tags, max. five × 10 per workspace |
| VISION & MISSION | None in the current schema | Eyebrow 30; Vision heading 60/description 130; Mission heading 60 and exactly three required points × 70 |
| WHAT GUIDES US | Heading 20; exactly three principles with title 30/description 110 | Eyebrow 30 |
| CLIENTS & COLLABORATORS | Partners heading 30 and separate Partner CRUD | Eyebrow 30; heading 60; one description 380 with paragraphs; up to five ordered types × 25 |

`GET/PATCH /admin/homepage/about` uses a structured `edit` DTO for supported fields only. Pending values are returned separately with false capability flags. A save includes `expectedVersion` and `edit`; the API locks the existing singleton and fixed rows, rejects stale versions, validates fixed identities and changed text limits, and commits all supported changes together. Audit and revision inserts share the transaction. Hidden names, visibility, order, icons, and CTAs are never included in these updates. Unchanged legacy over-limit text is preserved. It is neither truncated nor silently replaced by a shorter default. Editable fixed controls show counters and inline errors; pending controls cannot falsely report a save.

The same pure contract at `backend/src/contracts/aboutTeam.ts` supplies the missing-field defaults and validators to CMS and public rendering. Both live and presentation-only About paths use `resolveAboutContent`, including complete Highlight text, workspace content, Vision/Mission, principles, and safe Clients paragraphs. The main ABOUT US heading, complex logo layers, parallax, decorative icons, workspace brands, numbering, and animations remain restricted.

## Dynamic cards and logos

`/admin/homepage/team/members` and `/admin/homepage/about/partners` provide bounded paginated/searchable lists and dedicated POST/PATCH/DELETE workflows. Record creation and publication can commit in one transaction. They enforce the existing `team.*` and `partners.*` permission families, CSRF, strict request schemas, media references, audit logs, and revisions. Slugs are generated with collision-safe suffixes and remain unchanged during normal edits. No public Team Member or Partner detail route is introduced. Team records never create CMS `users`, invitations, or privileges.

Member fields are name (150), role (190), description (existing 1000-character storage maximum), required photo, status, and optional member-specific LinkedIn/Instagram/X/GitHub profiles. The icon selector uses four recognizable branded icons and accessible labels. Profiles use their four existing columns, HTTPS/official-host validation, and no fabricated platform-homepage fallback. The back preview is scrollable and warns about overflowing text without truncating it or inventing a shorter save limit.

Partner fields are name (150), required logo, optional safe HTTP(S) URL, and publication status. A missing URL produces a non-clickable public logo. The film-strip frame, motion, and speed behavior remain in place. Repeated decorative frames are excluded from keyboard navigation; the first frame set retains real links.

Both editors select existing images from Manajemen Aset's Halaman Utama grouping. Direct upload is disabled inside the editor's picker. It offers JPG, PNG, WebP, and AVIF; the server checks image format and section independently. Team artwork should be 1080 × 1350 px; available metadata drives a visible dimension warning, and the API returns a warning on mismatches. Asset upload remains a separate Manajemen Aset workflow.

Generic Team/Partner publication also validates required details and existing media references. Publication timestamps are written only to tables that actually define `published_at`; Team and Partners do not have that column.

## Public rollout and preparation

`TEAM_MEMBERS_PUBLIC_ENABLED` and `PARTNERS_PUBLIC_ENABLED` default to false. The public homepage response carries their activation state. Publishing one prepared record never replaces all nine static Team cards or the existing static Partner film roll. There is no automatic merge, Cloudinary upload, or database seed. Original assets are preserved.

To prepare a replacement collection:

1. Review the original card/logo assets and approved identity copy. Use the Canva template as needed; keep the original files intact.
2. Upload the finished artwork through Manajemen Aset → Halaman Utama. Choose 1080 × 1350 px for Team cards.
3. Create the matching website Team/Partner records and review names, roles, bios, logos, and individual links. Publish using an authorized role.
4. Verify the complete intended collection and ordering on an isolated preview. Check zero/one/two/many Team counts, flipping, ring navigation, and optional Partner links.
5. Obtain the owner's explicit approval to replace the static collection. Then change only the corresponding API flag through the normal deployment workflow. Allow up to 60 seconds for public API cache expiry.
6. Verify the public result. Rollback is the corresponding flag set to false; prepared records and original assets remain intact.

When managed collections are active, empty published collections show an empty state. Team fan slot/ring calculations handle zero, one, two, nine, and larger counts; collection identity changes reset stale active/flip/drag references. The mode toggle, perspective, pointer drag, and reduced-motion paths remain available.

## Pending schema and activation

The detailed matrix, types, nullability, primary/foreign keys, unique positions, fixed Mission slots, backfill, and activation sequence are in [CMS pending database requirements](cms-pending-database-requirements.md#our-team--about-us). No migration file is changed by this task. No Aiven DDL or production data update is executed. The missing About fields and template URL require additive storage, reviewed backfill, and a later schema-ready gated persistence implementation before they become editable. The current false capabilities cannot be enabled merely by adding a table.

## Verification

Automated tests cover supported/pending text boundaries, fixed identities, duplicate-list validation, paragraphs and bullets, atomic fixed saves and rollback, stale-version rejection, Team/Partner creation/edit/publication/deletion, media checks, safe profile URLs, template roles, authentication/CSRF, and legacy-write prevention. Frontend resolver tests cover variable card counts, explicit rollout, missing-profile behavior, canonical breadcrumbs, and untruncated legacy copy.

Chromium checks use mocked API responses only. They exercise five About panels, the 110/111-character boundary, supported-only save payloads, mobile width, card required fields and individual profiles, selection-only Halaman Utama assets, nested-dialog Escape behavior, and read-only access. Public checks also passed for static nine-card preservation, fan/ring switching, flipping in both directions, zero/one/two/twelve managed members, configured profiles, optional Partner destinations, and decorative-frame keyboard exclusion in both normal-motion and reduced-motion modes. No test connects to production Aiven or automatically imports the static assets.

Verification result (23 October 2026, Asia/Jakarta): clean dependency installation succeeded in both projects; frontend TypeScript, 52 tests, and production build passed; backend typecheck, ESLint, 177 tests, build, and OpenAPI validation (76 paths) passed. The backend suite uses isolated fixtures, not a live MySQL instance. Chromium checks used mocked responses at desktop and 390 px mobile widths; they do not establish production Aiven connectivity or pixel-perfect equivalence to the supplied reference screenshots. No production deployment or collection activation was performed.

## Changed-file map

- Dedicated CMS pages and styles: `src/admin/pages/AboutSettingsPage.tsx`, `TeamSettingsPage.tsx`, `about-team.css`.
- Shared editor controls and workflows: `src/admin/about-team/CollectionManager.tsx`, `EditorControls.tsx`, `useFixedEditor.ts`; `src/admin/components/MediaPicker.tsx`.
- CMS navigation: `src/admin/AdminApp.tsx`, `breadcrumbs.ts`, `resources/catalog.ts`.
- Public integration: `src/App.tsx`, `src/components/AboutPresentation.tsx`, `OurTeamSection.tsx`, `about/AboutEditorialContent.tsx`, `src/public/aboutTeam.ts`, `client.tsx`.
- API contracts, routes, services: `backend/src/contracts/aboutTeam.ts`, `routes/aboutTeam.ts`, `services/aboutTeam.ts`, `services/homepageCollections.ts`.
- API integration and compatibility: `backend/src/app.ts`, `config/env.ts`, `repositories/content.ts`, `routes/content.ts`, `schemas/resources.ts`, `services/content.ts`, `services/mediaReferences.ts`; `backend/.env.example`, `backend/docs/openapi.yaml`.
- Regression tests: `backend/tests/about-team.test.ts`, `tests/about-team.test.ts`.
- Documentation: this document and `docs/cms-pending-database-requirements.md`.

These 33 files exclude the pre-existing database reconciliation and prepared-migration working changes.
