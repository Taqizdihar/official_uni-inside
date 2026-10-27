# CMS Create/Edit implementation matrix

| Resource | Create and Edit architecture | Related data and route decision |
| --- | --- | --- |
| Products | One Product form with Create and Edit modes | Existing images, features, variants, and purchase links load into inline controls. Edit uses `/admin/products/:key/complete`; Create retains `/admin/products/compose`. Child IDs are checked in the update transaction. Unsupported purchase platforms stop Edit loading rather than being remapped. |
| Services | One Service form with Create and Edit modes | Images, information items, and steps load into the same repeatable controls. Edit uses `/admin/services/:key/complete`; Create retains `/admin/services/create-complete`. |
| News / Articles | One Article form with Create and Edit modes | Gallery, author, and reading time load in place. Edit uses `/admin/news/:key/complete`; Create retains `/admin/news/create-complete`. Existing gallery captions are preserved. |
| Projects and other generic dynamic resources | Shared generic resource editor already handles Create and Edit | Existing route and permission model retained; project relations remain in the same editor page. |
| Categories | Unified category management page handles both operations | Historical category URLs redirect to the unified page. |
| Achievements | Same management page and dialogs handle both operations | Fixed homepage identities and ordering retained. |
| Social Media | Same account management interface handles Create and Edit | Capability checks and account permissions retained. |
| Users and roles | Same administration interfaces handle Create and Edit | Permissions and audit behavior retained. |
| Homepage, secondary pages, Footer, and Media Kit | Fixed-identity single-page editors | No artificial Create route is introduced. Historical page-settings and site-settings CMS URLs redirect to their dedicated editors. |

The generic Product, Service, and News Edit view is no longer reachable through active CMS routes. The redundant explicit Service and News Create route registrations were removed. Generic SEO and social-preview inputs were removed from all resource definitions, while public metadata columns and projections remain untouched. Public Uni-Tools routes are preserved; the CMS sidebar has no Uni-Tools entry.

The new complete Edit API preserves parent IDs, slugs, stored SEO values, and unchanged child identifiers. Child changes and audit/revision writes share one transaction. Product variant photos and Social Media V2 account references remain gated by their existing backend readiness checks. If an old Product uses an unsupported purchase platform or more than eight gallery images, its Edit form stops before saving to avoid losing data. Historical child-list routes remain available for those compatibility cases; no backend endpoint used by existing clients was removed.
