# Product creation form

The redesigned creation screen is `/admin/content/products/new`. Existing product
edit routes and normalized child editors remain available. No migration is included
or required for the supported fields.

`POST /api/v1/admin/products/compose` requires a session, CSRF, and `products.create`.
It creates the product and its selected images, features, variants, and purchase
links in one transaction. `action: publish` additionally requires `products.update`
and `products.publish` and the same publication completeness rules as existing
products. Failure rolls back the whole operation; draft never implies publication.
The legacy `POST /admin/products` contract remains available.

Images use `products.cover_media_id` and `product_images`. The cover is first in
`product_images`, followed by at most eight gallery images. Features use
`product_features`. Platform URLs and order use `product_purchase_links`.
WhatsApp is resolved from the active Social Media setting when saving and when
serving public product detail; no manual WhatsApp URL is accepted by this form.
No valid global setting means the WhatsApp selection cannot be saved and no broken
public WhatsApp link is generated.

Full descriptions are sanitized on write and public read. The required legacy
`short_description` is derived on the server as plain text (at most 500 characters).
Generic product edits retain an explicitly supplied short description. Underline
is supported in both the new form and the existing product editor; legacy headings
and quotes remain readable. Public purchase actions use icons with accessible
names and preserve purchase-click analytics.

The variant table's price is the final price. Its difference from the product's
base price is stored in the existing `product_variants.price_adjustment` column.
A base price is required when saving variants. No new variant price column is needed.

## Deferred database dependency

**Variant photo** is the only unsupported persistence field. The UI can select,
preview, replace, and remove a variant photo, but explicitly blocks both saves
while a variant photo is selected. The API also rejects a non-null variant
`media_id` with `VARIANT_IMAGE_UNSUPPORTED`. Other product and variant fields can
be saved after removing variant-photo selections.

At the final database-update stage, add a nullable `product_variants.media_id`
with the same BIGINT UNSIGNED type as `media_assets.id`, an index, and a foreign key
to `media_assets.id` (ON UPDATE CASCADE, ON DELETE RESTRICT). Then extend the
variant resource schema, compose persistence, media-reference checks, admin/public
projections, and tests. Backfill is unnecessary for existing variants, whose
photo remains null. This document is a dependency record; no SQL or migration is
created or executed here.
