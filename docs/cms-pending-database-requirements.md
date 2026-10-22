# CMS database capability and pending requirements

This is a planning reference, not an authorization to change the schema. The separate database reconciliation work owns migration 001 checksums, missing CHECK constraints, prepared 002–004 migrations, and any Aiven execution. Its live state must be verified independently; repository files alone do not establish which migrations ran in production.

| Capability | Current status | Schema requirement |
| --- | --- | --- |
| Super Administrator manual password reset | Supported by initial schema | Reuses `users.password_hash`, `users.password_changed_at`, `auth_sessions`, `password_reset_tokens`, and `audit_logs`. No new migration. |
| Super Administrator direct member creation | Supported by initial schema | Reuses `users`, `roles`, `user_profiles`, and `audit_logs`. Active account and Argon2id password hash are inserted together; the generated temporary password is returned once and never stored in plaintext. No SMTP or migration required. Existing invited email addresses are rejected rather than activated. |
| Bagian-based Cloudinary image organization | Supported by initial schema | Reuses `media_assets.folder_path` and `public_id` for generic Bagian folders and existing contextual folders. No new migration or rewrite of historical assets. |
| Automatic content URL slugs | Supported by initial schema | Reuses existing unique slug indexes. New records receive collision-safe suffixes; existing URLs remain stable when titles change unless explicitly edited. No new migration. |
| Activity History actor names and friendly labels | Supported by initial schema | Join `audit_logs.actor_user_id` to `users.id`/`users.display_name`; display labels are presentation logic. No new audit name column or migration. |
| Social Media account platform and description | Prepared by separate database work | `social_platforms`, `social_links.platform_id`, and `social_links.description` are in staged 002. Production application status is separately verified by the database owner. |
| Product purchase account reference | Prepared by separate database work | `product_purchase_links.social_link_id` is in staged 003. |
| Product variant image reference | Prepared by separate database work | `product_variants.media_id` is in staged 004. |
| Footer Social Media placements | Proposal only | Persistent ordered references to stable `social_link_id`, unique slot/account rules, limit of ten, and explicit inactive/deletion policy require separately approved design and migration. The current picker is local preview state. |
| Footer Google Maps Embed URL | Proposal only | Persistent URL storage and validation require separately approved design and migration. The current input is local preview state. |
| Missing historical CHECK constraints | Separate reconciliation | Follow the database audit team's reviewed comparison and migration plan. Do not infer their live status from the current repository. |
| Force password change on next login | Optional future security proposal | Would require durable state, such as a reviewed `must_change_password` flag or equivalent, plus login enforcement. It is not part of the approved manual reset. |

Activity History grants its safe, bounded read model to all five established authenticated CMS roles through application policy. Configurable `audit.view` permission records are not rewritten. Raw audit snapshots remain unavailable in that read model.

No migration or production database operation is included in this administration task. See [Social Media CMS implementation](social-media-cms-implementation.md), [Footer CMS implementation](footer-cms-implementation.md), and [database migration phase 1](database-migration-phase-1.md) for related ownership and readiness details.
