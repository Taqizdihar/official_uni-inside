# Public content alignment audit

This matrix follows the approved CMS Create forms and fixed Secondary Pages contract. Public API paths are under `/api/v1`. IDs, slugs, status, sort order, timestamps used only for eligibility, and audit fields remain implementation data; they are not separate visual controls. The work uses the existing schema and does not migrate or delete database records.

| Approved CMS field | Storage and public projection | Public component | Result |
| --- | --- | --- | --- |
| Product cover and up to eight ordered gallery images | `products.cover_media_id`, `product_images`; `GET /products` image, `GET /products/:slug` image/images | Catalogue card, banner auto mode, detail gallery | Bound; missing media uses neutral fallback |
| Product name, category, type and rich description | `products.name/category_id/product_type/description`; detail adds category name; summary derives from description | Catalogue card, detail heading/type/category/story | Bound; description sanitized |
| Product feature label/value | `product_features`; detail features ordered by sort and ID | Detail specifications | Bound; empty pairs hidden |
| Product base price, currency, note, availability, lead time, minimum order | `products` fields; list/detail projection | Catalogue card and detail sales section | Bound; optional/zero values guarded |
| Product variant name, final price, stock, active status, order, optional photo | Editor final price stores `product_variants.price_adjustment`; detail projects `final_price` and gated `image_url/image_alt` without exposing the delta; only active rows queried | Detail option cards and selectable gallery image | Bound; null stock distinguished from zero; fractional prices retained; final price preserved when base price changes |
| Product purchase platform, label, URL, WhatsApp account, primary/order | `product_purchase_links` and guarded Social Media V2 account reference; detail resolves account URL and filters invalid URLs | Detail purchase buttons | Bound; primary order retained; account selection available to editors when V2 is ready |
| Historical product colors | `product_color_options` retained in database | No public or approved CMS control | Retired without deleting rows |
| Product catalogue banner and editorial copy | `page_settings` plus guarded `secondary_page_content_slots` and `banner_media_id`; `GET /site` | `/products` hero, listing and CTA | Bound; automatic mode uses actual published product image; manual mode uses saved Media Library asset |
| Service cover, ordered gallery, name, category, summary, rich description | `services`, `service_images`; list/detail projection | `/services` cards and `/services/:slug` gallery/story | Bound; rich text sanitized |
| Service pricing type, amount, currency, note and duration | `services.pricing_type/starting_price/currency_code/price_note/estimated_duration` | Detail pricing block | Contact/fixed/starting/range semantics retained; no invented range endpoint |
| Service scope items and process steps | `service_list_items`, `service_process_steps`; detail children in saved order | Four scope groups and process sequence | Bound; empty groups hidden |
| Service CTA label and destination | `services.primary_cta_label/primary_cta_url` | Detail CTA | Bound; safe destination fallback |
| Services page editorial fields | `page_settings`/secondary slots through `GET /site` | Hero, fixed `#studio-offerings` scroll, listing heading, bottom CTA | Bound; scroll destination stays fixed |
| Article cover, title, category and content type | `news_articles`, `media_assets`, `news_categories`; list/detail projection | News cards, detail heading/meta | Bound; topic and format are distinct |
| Article excerpt, body, author source, date and saved reading time | `news_articles`; detail resolves user/team display name | News cards and detail editorial header/body | Bound; HTML sanitized; saved time used without recalculation |
| Article ordered gallery and captions | `news_images`, `media_assets`; detail images ordered by sort and ID, Media Library caption preferred | Detail gallery | Bound; cover deduplicated |
| News archive editorial fields | `page_settings`/secondary slots through `GET /site` | Hero, archive heading, Latest sidebar | Bound; independent of Homepage selection limit |
| Media Kit fixed copy slots | `page_settings`/secondary slots for database key `media_kit` | `/media-kit` hero, overview, two workspaces, three capabilities, palette explanation, typography, logos, contact | Bound; official artwork/colors/fonts/downloads remain fixed |
| Media Kit contact email | Footer public email via `GET /site` | `mailto:` actions | Bound; no duplicate Media Kit email field |

The generic Product editor keeps existing product and child IDs. Variant editing now presents the final price and converts it to the stored delta on save; a base-price edit preserves existing variant final prices in the same transaction and records revisions and audit events. The generic Article editor exposes saved reading time and enforces one author source. Variant-photo and WhatsApp-account edits use guarded audited endpoints because their columns are conditional V2 capabilities. They remain unavailable until those existing capabilities report ready; this change adds no migration or feature activation.

Preview records remain confined to explicit design-preview routes. The real catalogue uses a neutral empty banner, and the Homepage News cards no longer substitute sample event records or photos when live content is unavailable. Preview analytics are suppressed by the existing route guard. A live Aiven data comparison and production browser check require the deployed API/database; local browser checks use mocked published API responses.
