# Uni-Inside CMS API — Phase 1

This independent Node 20+ package serves the `/admin` CMS and public content API. The root React build communicates with it over HTTP and retains static public fallback content when the API is unavailable.

## Layout

`src/app.ts` assembles HTTP middleware and routes; `src/routes` stays thin; `src/services` owns business rules and transactions; `src/repositories` owns parameterized MySQL queries; `src/schemas` lists explicit editable fields; `src/database` owns pool and migrations. `scripts` contains operational commands, `tests` contains unit/API checks, and `docs/openapi.yaml` documents routes.

The schema source of truth is `migrations/001_initial_schema.sql`, copied byte for byte from the approved MySQL 8 migration. It creates 52 tables and seeds five roles and 51 permissions. Later database changes belong in forward-only files named `002_*.sql`, `003_*.sql`, and so on. Do not edit an applied migration; checksum mismatches stop execution. The existing runner can adopt a null checksum for a manually applied migration 001 after checking expected tables and selected seeds, but those checks alone do not establish which SQL file was executed.

Phase 1 proposals for Social Media accounts and Product references are staged in `migrations/prepared/` and are not discovered by the migration runner. Do not promote or execute them on production until the migration 001 checksum and production schema have been independently verified. Follow the [Phase 1 administrator guide](../docs/database-migration-phase-1.md) before using either the runner or DBeaver on Aiven.

## Local setup with Laragon/phpMyAdmin

1. Create an empty MySQL 8 database named exactly `uni-inside` in phpMyAdmin. Use `utf8mb4_0900_ai_ci`.
2. From `backend/`, run `npm ci` and copy `.env.example` to `.env` locally. Set database connection fields and generate two separate random 32+ character peppers. Never commit `.env`.
3. Run `npm run db:status`, `npm run db:migrate`, then `npm run db:check`. If you already ran the supplied SQL manually, `db:migrate` verifies it and adopts its checksum rather than recreating data.
4. Bootstrap the first administrator without putting the password in shell history:

   ```bash
   read -rsp 'New administrator password: ' cms_password
   printf '\n'
   printf '%s\n' "$cms_password" | npm run admin:create -- --email you@example.com --name 'Your Name' --password-stdin
   unset cms_password
   ```
5. Run `npm run dev`. `GET http://localhost:4000/api/v1/health` confirms the process; `/api/v1/ready` confirms database and migration readiness.

Build/test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run openapi:check`, `npm run build`, `npm start`. The build emits `dist/`; the production start command runs compiled JavaScript. Run `npm run auth:cleanup` and `npm run analytics:rollup` as scheduled jobs. Commands that connect to MySQL need working database settings; builds and unit/API tests do not.

## API and roles

All routes are under `/api/v1`. Public reads include `/site`, `/homepage`, `/team-members`, `/partners`, `/products`, `/services`, `/projects`, `/news`, and `/achievements`, with slug details for the four main collections. `/analytics/events` collects enumerated anonymous events with UUID deduplication. The protected `/admin` routes cover users, invitations, permissions, dashboard, analytics, audit, media, revisions, dynamic content and fixed settings. See [`docs/openapi.yaml`](docs/openapi.yaml) and [`src/schemas/resources.ts`](src/schemas/resources.ts) for the exact route and editable-field inventory.

The seeded `super_admin` has all permissions. `administrator` lacks `roles.manage`; `editor` can publish; `author` can create and edit drafts; `viewer` has read access. Middleware reads permissions from MySQL on each authenticated request so role changes take effect immediately. Fixed structural records have GET/PATCH only. Public content includes published records and scheduled records after their due time; unpublished and deleted records are hidden. Publishing checks required fields and related purchase paths. Authenticated mutations record safe audit entries; content updates also create server-generated revisions.

There is no sign-up. Login sets a random opaque HttpOnly session cookie; only an HMAC hash is stored in `auth_sessions`. Mutations require an allowed browser Origin plus a session-bound CSRF token in the `X-CSRF-Token` header, matching the readable CSRF cookie. `GET /auth/me` returns the current token. Login, invitation acceptance, and password reset are rate limited. Production requires a Secure session cookie. Use `SESSION_COOKIE_SAME_SITE=none` for genuinely cross-site HTTPS requests (the current Pages/Render pairing), or `lax` only after confirming the frontend and API are same-site HTTPS subdomains. The session cookie remains host-only; do not set a broad cookie domain.

Invitation and reset URLs are emailed through SMTP. When SMTP is absent, development responses may include the generated URL for local testing. Production returns `503 INTEGRATION_NOT_CONFIGURED` instead of revealing tokens. Image uploads use Cloudinary signed direct upload: request `/admin/media/sign-upload`, upload to Cloudinary, then call `/admin/media/finalize`; the backend verifies the remote image and records metadata. Set optional `CLOUDINARY_ROOT_FOLDER` (default `uni-inside`) to choose a controlled root. Signed `asset_folder` and `public_id_prefix` keep images in backend-managed scope and entity folders. The media library supports filename search, scope filtering, and paginated totals. Only jpg/jpeg/png/webp/avif images up to 10 MB are accepted. Media signing returns 503 until Cloudinary is configured. Deleting an image record is blocked while it is referenced. Files manually uploaded to Cloudinary do not automatically become CMS records.

Analytics stores event UUID, coarse device type, normalized path, optional entity and destination, and a daily rotating HMAC of a network identifier. It does not persist raw IPs, form content, names, or full cookies. The rollup command is idempotent; raw events older than `ANALYTICS_RETENTION_DAYS` are deleted. Rotate `ANALYTICS_HASH_PEPPER` deliberately if visitor continuity must be reset.

## Environment and deployment

Use `.env.example` as the full variable list. Local Laragon needs `DB_HOST`, `DB_PORT`, `DB_NAME=uni-inside`, `DB_USER`, `DB_PASSWORD`, and `DB_SSL_MODE=disabled`; the private-network opt-in stays false. Production Render/Aiven keeps `DB_SSL_MODE=required`, `DB_SSL_REJECT_UNAUTHORIZED=true`, `DB_SSL_ALLOW_PRIVATE_NETWORK=false`, and `DB_SSL_CA_BASE64` containing Aiven's validated base64 CA certificate. In `required` mode, the MySQL driver always uses verified TLS; a custom CA is optional only when the provider's certificate chains to the system trust store. A supplied CA is validated before use. A TLS connection error never causes a plaintext retry. MySQL's database name is passed through the driver configuration, not interpolated into SQL.

For a later Kroombox setup, confirm its database networking first. If Kroombox supports MySQL TLS, select `DB_SSL_MODE=required` and retain certificate verification; supply `DB_SSL_CA_BASE64` if it requires a custom CA. If TLS is unavailable, select `DB_SSL_MODE=disabled` with the explicit `DB_SSL_ALLOW_PRIVATE_NETWORK=true` **only after Kroombox confirms the selected host is reachable exclusively on its private network and is not publicly exposed**. This flag records an operator decision; it does not detect private networking. Never set a CA in disabled mode or choose plaintext because a TLS connection failed. Kroombox's reverse-proxy chain must also be confirmed: production currently requires `TRUST_PROXY=true` and trusts exactly one hop. A different chain needs a separate reviewed configuration change.

The official frontend origin is `https://uniinside.net`; the API's eventual public URL must be `https://<dedicated-api-subdomain>.uniinside.net/api/v1`. The existing `api.uniinside.net` belongs to another Uni-Inside service, so select an unused API subdomain after confirming availability. Configure `PUBLIC_FRONTEND_URL`, `ADMIN_FRONTEND_URL`, and exact HTTPS `CORS_ALLOWED_ORIGINS` accordingly. `/api/v1/health` checks process liveness; `/api/v1/ready` checks database, schema, and migration readiness. Keep passwords, peppers, Cloudinary secrets, and SMTP credentials in protected runtime settings, never in Git or logs.

Render can use `backend` as Root Directory, build command `npm ci --include=dev && npm run build` (build tools are dev dependencies, even when `NODE_ENV=production`), start command `npm start`, and health path `/api/v1/health`. Run migrations separately before serving production traffic and monitor `/api/v1/ready`. Aiven production TLS requires verified certificates and valid `DB_SSL_CA_BASE64`. The complete Render, Cloudflare, and Aiven configuration is in the [Stage 3 deployment guide](../docs/deployment-stage-3.md). Never prefix backend secrets with `VITE_`.

The unofficial architecture uses Cloudflare Pages for React, Render for this API, Aiven MySQL, and Cloudinary for images. No services are provisioned by this repository. Kroombox's runtime and database behavior must be verified before configuring the official environment.

The earlier CMS interface work added no migration after `001_initial_schema.sql`. The proposed Social Media and Product references are prepared separately and remain inactive pending administrator verification. SMTP can remain unset for local testing, and Cloudinary remains real external storage while using local MySQL.

If TLS fails, verify the Aiven CA and base64 encoding rather than disabling certificate checks. If browsers cannot authenticate, check the exact CORS Origin, HTTPS, Secure/SameSite cookie settings, and `X-CSRF-Token`. If a migration checksum differs, compare the applied schema with the migration file and add a new forward migration instead of changing migration 001.
