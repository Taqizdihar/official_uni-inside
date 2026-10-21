# Centralized Social Media CMS handoff

## Delivered behavior

`/admin/site/social-links` is the single sidebar destination for **Manajemen Sosial Media**. It has horizontal keyboard-operated platform tabs, a searchable catalog of 12 platforms with explicit `react-icons` mappings, account cards, and add/edit/delete dialogs. Legacy codes such as `instagram_studio` and `instagram_craft` group under one Instagram tab. Unknown legacy codes remain visible for administrative review but cannot be used to create new accounts. Existing account IDs, URLs, and labels are never rewritten merely by viewing them. The old per-record editor route remains available from the read-only preview while the new capability is off.

The frontend first reads `/admin/social-media/capabilities`. A `404` from an older backend is treated as both capabilities off, so frontend deployment order cannot accidentally switch Product creation away from its legacy global WhatsApp behavior. Other backend errors remain visible. Until Social Media V2 is both explicitly enabled and schema-ready, the page reads the existing authenticated `/admin/social-links` API and displays a **read-only preview**. It permits inspection of platform selection and account form design, but does not call V2 data endpoints, submit V2 mutations, persist demo data, or claim a successful save. Editors can still use the labeled legacy editor. The public Footer retains its four existing slots and URL behavior.

When activated later, the dedicated API provides:

| Method and path | Purpose | Permission |
| --- | --- | --- |
| `GET /api/v1/admin/social-media/capabilities` | Flag and schema readiness | Signed-in CMS session |
| `GET /api/v1/admin/social-media/platforms` | Ordered registry | `settings.view` |
| `GET /api/v1/admin/social-media/accounts[/:id]` | List/detail, including inactive accounts | `settings.view` |
| `POST /api/v1/admin/social-media/accounts` | Create account | `settings.update` + CSRF |
| `PATCH /api/v1/admin/social-media/accounts/:id` | Edit without platform reassignment | `settings.update` + CSRF |
| `DELETE /api/v1/admin/social-media/accounts/:id` | Delete only when unreferenced | `settings.update` + CSRF |
| `GET /api/v1/admin/social-media/whatsapp-options` | Active Product form choices | `products.create` or `settings.view` |

All responses use the existing `data` envelope. Unready V2 routes return `503 FEATURE_UNAVAILABLE`; validation, fifth-account limit, referenced-account conflicts, authorization, and CSRF use controlled errors. SQL is parameterized and the account service audits successful mutations without recording URL query strings.

## Gates and database dependencies

`SOCIAL_MEDIA_V2_ENABLED=false` and `PRODUCT_VARIANT_MEDIA_ENABLED=false` are independent backend flags and default to false when absent. If both are false, the capability endpoint performs **no new-schema metadata query**. When a flag is true, its capability becomes ready only after required columns and foreign keys are visible. Social Media V2 additionally requires all 12 supported platform rows and no unmapped legacy accounts. A browser setting cannot override the backend gate. `/ready` and its migration integrity checks are unchanged.

Social Media V2 requires `social_platforms` (ID, code, name, icon, order), `social_links.platform_id`, `social_links.description`, and `product_purchase_links.social_link_id`, plus the platform and purchase-link foreign keys. Variant media requires `product_variants.media_id` and its media foreign key. The separate database migration owner is responsible for 001 reconciliation, missing CHECK constraints, final migration numbering, and database execution. This feature does not change migration files or history.

The new account code stored in legacy `social_links.platform_code` is `acct_` plus a random UUID without hyphens. It fits `VARCHAR(64) UNIQUE`, is independent of editable labels, and does not alter reserved legacy codes. Account creation locks the parent `social_platforms` row with `FOR UPDATE`, then counts and inserts inside one transaction. This serializes concurrent creates for one platform and enforces five accounts per platform. The generic legacy Social Links write routes remain usable before readiness; once V2 is enabled and schema-ready they reject writes, preventing bypass of the new limit and reference guards.

The Product form keeps manual URLs for Shopee, Tokopedia, TikTok Shop, and Shopify. With Social Media V2 off, WhatsApp retains the existing global-link behavior and sends no `social_link_id`. With V2 on, the editor must choose an active saved WhatsApp account; the backend verifies its canonical platform and status in the Product transaction, saves its ID into `product_purchase_links.social_link_id`, and retains the current account URL in the legacy `url` column. A published Product with a reference follows later account URL edits through the selected account. Deactivation and deletion of referenced accounts are blocked. Legacy unreferenced WhatsApp Product links continue to resolve through the global setting. A selected account is never replaced with an unrelated global account.

Variant photos retain the existing unsupported validation while their gate is off. When enabled and schema-ready, Product creation validates selected media is not soft-deleted, saves each selected `media_id` inside the Product transaction, and can include image metadata in Product detail responses. Media rename, move, and soft-delete reference checks then include `product_variants.media_id`; they do not query that column while the capability is off. The public Product page design is unchanged.

## Validation and testing

The API validates a trimmed label suffix and a combined label of at most 100 characters. It rejects a repeated platform prefix, descriptions over 1,000 characters, and non-HTTPS, credential-bearing, redirect, wrong-domain, or oversized account URLs. The frontend mirrors these checks for immediate feedback; the server is authoritative. The UI uses the existing `CmsModal` focus trap, Escape handling, restoration, styled confirmation dialogs, unsaved-changes warning, and permission-aware controls. CSS is page-scoped and responsive.

Frontend model tests cover icon renderability, legacy grouping, search, keyboard tab movement, independent account caps, label construction, and URL validation. Mocked backend tests cover disabled default flags, no V2 SQL while disabled, unavailable routes, auth and CSRF, parent-row locking and the sixth-account rejection, reference guards, and the separate Product gates. These tests establish service logic and SQL order; they **do not prove database concurrency under live load**. Type checking, linting, builds, full test suites, and OpenAPI validation are part of repository verification. No new feature browser-to-Render-to-Aiven test or production CRUD operation was performed.

## Future activation

1. Complete 001 checksum reconciliation and corrective CHECK-constraint work in the database session.
2. Apply and independently verify the final social-platform, Product reference, and variant-media migrations on Aiven with their final version numbers.
3. Check the backend `/ready` integrity result and the capability endpoint with both flags still false.
4. In an approved rollout, enable `SOCIAL_MEDIA_V2_ENABLED` and/or `PRODUCT_VARIANT_MEDIA_ENABLED` separately on Render after verifying schema readiness. Leave the other gate off if its dependency is missing.
5. Perform separately authorized end-to-end CRUD, concurrent-create, referenced-account, Product creation, and public-link verification against Aiven. Then confirm the full CMS experience and monitor controlled errors.

Future Footer placement selection needs its own approved UX and schema decision. This implementation does not add a speculative placement table or expand public social-account exposure.
