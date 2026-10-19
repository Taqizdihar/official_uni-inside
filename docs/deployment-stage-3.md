# Stage 3 deployment preparation

This guide prepares the repository for a temporary deployment. The code and commands have been locally validated; no external service was configured or contacted as part of this work.

## Architecture

```text
Browser
  → Cloudflare Pages frontend
  → HTTPS Render API
  → TLS-verified Aiven MySQL

Render API
  → signed Cloudinary upload workflow
  → Cloudinary image storage
```

Cloudflare serves the public React application and `/admin`. It receives only the public `VITE_API_BASE_URL`; database credentials, authentication peppers, and Cloudinary API secrets stay on Render.

## Cloudflare Pages

Configure the project with repository `Taqizdihar/official_uni-inside`, temporary production branch `hosting`, Vite framework preset, build command `npm ci && npm run build`, and output directory `dist`. Use Node 20 or a compatible newer version.

Set the production build variable to the actual Render URL:

```text
VITE_API_BASE_URL=https://<RENDER-SERVICE>.onrender.com/api/v1
```

This URL is public and contains no secret. Replace the placeholder with the real service hostname. A build-time variable change requires a new Pages deployment. Preview deployments have their own origin and will fail backend CORS unless each exact preview origin is explicitly configured; never use wildcard CORS to accommodate previews.

`public/_redirects` preserves the SPA fallback so direct navigation and refresh work for `/`, `/admin`, `/admin/login`, `/admin/dashboard`, the public collection and detail routes, and `/media-kit`. Fingerprinted assets keep immutable caching while HTML is revalidated.

## Render Web Service

Create one service named `uni-inside-cms-api`, type Web Service, Node runtime, root directory `backend`, Free plan when available, and health path `/api/v1/health`. Configure build command `npm ci --include=dev && npm run build` and start command `npm start`. Select `hosting` in the Render Dashboard for this temporary stage. Do not configure a pre-deploy migration command; migrations remain an explicit operator action. Do not set `PORT`; Render supplies it.

Media Library uses authenticated, server-signed direct image uploads. Check that `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` belong to the same Cloudinary product environment; `CLOUDINARY_ROOT_FOLDER` defaults to `uni-inside`. The browser rejects files over 10 MB, and the CMS verifies Cloudinary's reported size again before saving to `media_assets`. Direct Upload API signing does not enforce a hard 10 MB transfer limit through `max_file_size`; configure a Cloudinary upload preset restriction supported by the account or route uploads through a size-limited server proxy if transfer-time enforcement is required.

### Environment-variable matrix

Set these on the Render service. “Secret” means the value belongs in Render's protected environment settings. The example column describes a safe format and contains no real credentials.

| Variable | Required | Secret | Source / safe format | Purpose |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | Yes | No | `production` | Production validation and cookie behavior |
| `HOST` | Yes | No | `0.0.0.0` | Bind on Render's network interface |
| `PORT` | Render | No | Supplied by Render | Listening port; do not set in Blueprint |
| `API_BASE_PATH` | Yes | No | `/api/v1` | API route prefix |
| `APP_NAME` | No | No | `Uni-Inside CMS API` | Service label |
| `PUBLIC_FRONTEND_URL` | Yes | No | `https://uni-inside.pages.dev` | Public site origin |
| `ADMIN_FRONTEND_URL` | Yes | No | `https://uni-inside.pages.dev/admin` | CMS links in messages |
| `CORS_ALLOWED_ORIGINS` | Yes | No | `https://uni-inside.pages.dev` | Comma-separated exact HTTPS origins |
| `TRUST_PROXY` | Yes | No | `true` | Trust Render's reverse proxy |
| `DB_HOST` | Yes | No | Aiven hostname | Aiven connection host |
| `DB_PORT` | Yes | No | Aiven port number | Aiven connection port |
| `DB_NAME` | Yes | No | Application database name | Database selection |
| `DB_USER` | Yes | Secret | Dedicated application user | Database login |
| `DB_PASSWORD` | Yes | Yes | Aiven-issued password | Database authentication |
| `DB_CONNECTION_LIMIT` | No | No | `5` | Pool size suitable for Free service limits |
| `DB_SSL_MODE` | Yes | No | `required` | Require TLS to Aiven |
| `DB_SSL_ALLOW_PRIVATE_NETWORK` | Yes | No | `false` | Keep the private-network plaintext exception off for Aiven |
| `DB_SSL_CA_BASE64` | Yes | Yes | Single-line base64 PEM | Verify Aiven's server certificate |
| `DB_SSL_REJECT_UNAUTHORIZED` | Yes | No | `true` | Require certificate verification |
| `REQUIRE_LATEST_MIGRATION` | Yes | No | `true` | Gate readiness on migration state |
| `SESSION_COOKIE_NAME` | No | No | `uniinside_session` | Session cookie name |
| `SESSION_COOKIE_SECURE` | Yes | No | `true` | Require HTTPS cookies |
| `SESSION_COOKIE_SAME_SITE` | Yes | No | `none` | Allow temporary cross-site browser requests |
| `SESSION_TTL_HOURS` | No | No | `12` | Absolute session lifetime |
| `SESSION_IDLE_TTL_MINUTES` | No | No | `60` | Idle session lifetime |
| `CSRF_COOKIE_NAME` | No | No | `uniinside_csrf` | Readable CSRF cookie name |
| `AUTH_TOKEN_PEPPER` | Yes | Yes | At least 32 random characters | Hash opaque session and action tokens |
| `ANALYTICS_HASH_PEPPER` | Yes | Yes | Different 32+ character random value | Pseudonymize analytics network identifiers |
| `PASSWORD_MIN_LENGTH` | No | No | `12` | Minimum account password length |
| `LOGIN_RATE_LIMIT_WINDOW_MINUTES` | No | No | `15` | Login rate-limit window |
| `LOGIN_RATE_LIMIT_MAX` | No | No | `8` | Login attempts per window |
| `API_RATE_LIMIT_WINDOW_MINUTES` | No | No | `15` | General API rate-limit window |
| `API_RATE_LIMIT_MAX` | No | No | `300` | Requests per general window |
| `ANALYTICS_RETENTION_DAYS` | No | No | `90` | Raw event retention period |
| `CLOUDINARY_CLOUD_NAME` | Optional group | No | Cloud name | Cloudinary account selector |
| `CLOUDINARY_API_KEY` | Optional group | No | API key | Signed upload configuration |
| `CLOUDINARY_API_SECRET` | Optional group | Yes | Cloudinary secret | Signs and verifies uploads |
| `CLOUDINARY_ROOT_FOLDER` | No | No | `uni-inside` | Root of backend-managed media folders |
| `SMTP_HOST` | Optional | No | SMTP hostname | Invitation and reset mail |
| `SMTP_PORT` | Optional | No | `587` | SMTP port |
| `SMTP_SECURE` | Optional | No | `false` for STARTTLS on 587 | SMTP TLS mode |
| `SMTP_USER` | Optional | Secret | SMTP account | SMTP authentication |
| `SMTP_PASSWORD` | Optional | Yes | SMTP password | SMTP authentication |
| `SMTP_FROM_NAME` | Optional | No | `Uni-Inside Studio` | Message sender name |
| `SMTP_FROM_EMAIL` | Optional | No | Verified sender address | Message sender address |
| `LOG_LEVEL` | No | No | `info` | Backend log verbosity |

Minimum temporary values are the required production values shown above. The Cloudinary triplet must be set together or left entirely unset. SMTP may remain unset; invitation and reset delivery then reports an integration error in production. Keep both peppers different and stable across redeployments. Never commit them or casually rotate them after production data exists.

For this temporary deployment, configure these values (replace every placeholder in Render's environment settings):

```env
NODE_ENV=production
HOST=0.0.0.0
API_BASE_PATH=/api/v1
PUBLIC_FRONTEND_URL=https://uni-inside.pages.dev
ADMIN_FRONTEND_URL=https://uni-inside.pages.dev/admin
CORS_ALLOWED_ORIGINS=https://uni-inside.pages.dev
TRUST_PROXY=true

DB_HOST=<Aiven host>
DB_PORT=<Aiven port>
DB_NAME=<Aiven database name>
DB_USER=<Aiven application user>
DB_PASSWORD=<Aiven password>
DB_SSL_MODE=required
DB_SSL_ALLOW_PRIVATE_NETWORK=false
DB_SSL_CA_BASE64=<single-line base64 CA>
DB_SSL_REJECT_UNAUTHORIZED=true
REQUIRE_LATEST_MIGRATION=true

SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=none
AUTH_TOKEN_PEPPER=<secret, at least 32 characters>
ANALYTICS_HASH_PEPPER=<different secret, at least 32 characters>

CLOUDINARY_CLOUD_NAME=<Cloudinary cloud name>
CLOUDINARY_API_KEY=<Cloudinary API key>
CLOUDINARY_API_SECRET=<Cloudinary API secret>
CLOUDINARY_ROOT_FOLDER=uni-inside
```

### Aiven CA conversion

Convert the downloaded Aiven `ca.pem` into a single-line base64 value. Put the result only in Render's protected `DB_SSL_CA_BASE64` variable, never Git.

PowerShell:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("C:\path\to\ca.pem")
)
```

Linux:

```bash
base64 -w 0 ca.pem
```

macOS:

```bash
base64 < ca.pem | tr -d '\n'
```

### Aiven preparation checklist

This is a manual checklist; this task did not connect to Aiven.

1. Create or select the intended Aiven database and prefer a dedicated application user over permanent use of `avnadmin`.
2. Allowlist the administrator's current IP for DBeaver and every outbound CIDR reported by the Render service.
3. Keep TLS verification enabled and use the CA from the Aiven service.
4. From `backend/`, configure a local secure environment and run `npm run db:status`, `npm run db:migrate`, then `npm run db:check` against the intended Aiven database.
5. Create the first hosted super-admin only after migration if it is not already present in migrated data.
6. Never edit migration `001` after it has been registered.

### Cloudinary

The backend uses root folder `uni-inside` by default and creates entity/slug folders automatically. Manual Cloudinary uploads do not become CMS media records. Use the signed backend-managed CMS upload and finalize flow. The Cloudinary API secret belongs only on Render.

## Deployment order

1. Push deployment-ready code to `hosting`.
2. Prepare the Aiven database and application user.
3. Apply and validate migrations manually.
4. Configure Render environment variables.
5. Deploy Render.
6. Verify `/api/v1/health` and `/api/v1/ready`.
7. Set `VITE_API_BASE_URL` in Cloudflare Pages.
8. Deploy or redeploy Cloudflare Pages from `hosting`.
9. Test public content.
10. Test `/admin` login.
11. Test authenticated CMS reads and mutations.
12. Test Cloudinary upload and finalize.
13. Test logout and session restoration.
14. Test analytics events and dashboard summaries.

The Pages and Render hosts are different sites (`pages.dev` and `onrender.com`), so browser privacy settings may block third-party cookies. The preferred long-term arrangement is a separately confirmed same-site API hostname or a carefully designed same-origin proxy. `api.uniinside.net` already belongs to another Uni-Inside service. This task does not add a proxy. Keep exact CORS origins, Secure cookies, `SameSite=None`, and CSRF checks enabled for the current cross-site setup.

## Smoke verification and browser checks

After both services are deployed, run from the repository root:

```bash
DEPLOY_API_URL=https://<RENDER-SERVICE>.onrender.com/api/v1 \
DEPLOY_FRONTEND_URL=https://uni-inside.pages.dev \
DEPLOY_ALLOWED_ORIGIN=https://uni-inside.pages.dev \
npm run smoke:deployment
```

The script checks liveness, readiness, a public envelope, allowed and disallowed CORS, frontend root and `/admin/login`, and obvious secret disclosure. It never attempts an administrator login or prints response bodies. Then manually verify browser login, session restoration, CSRF-protected editing, logout, and signed Cloudinary upload/finalize.

## Future official production switch

1. Keep the official `main` branch current with approved application changes.
2. Change the Render deployment branch to `main` in its Dashboard.
3. Keep Cloudflare Pages production on `main` or switch it there.
4. Update frontend and backend URLs to official domains and update exact CORS origins.
5. Choose a confirmed unused API subdomain under `uniinside.net` and reassess `SameSite` after that domain is active.
6. Redeploy and repeat all smoke and browser checks.

Do not merge branches as part of this preparation.

## Official Kroombox configuration planning

Kroombox has not been configured or verified by this guide. Confirm its Node runtime, environment-variable mechanism, SPA route fallback, API routing, reverse-proxy chain, MySQL compatibility, database network exposure, and TLS support before entering production values. Do not reuse `api.uniinside.net`; it serves another Uni-Inside system. The CMS frontend must eventually use `VITE_API_BASE_URL=https://<dedicated-api-subdomain>.uniinside.net/api/v1`, with a separately confirmed unused hostname. The backend's frontend/CORS values would be:

```env
NODE_ENV=production
PUBLIC_FRONTEND_URL=https://uniinside.net
ADMIN_FRONTEND_URL=https://uniinside.net/admin
CORS_ALLOWED_ORIGINS=https://uniinside.net
API_BASE_PATH=/api/v1
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=lax
TRUST_PROXY=<set only after confirming one trusted reverse-proxy hop>
DB_HOST=<Kroombox database host>
DB_PORT=<Kroombox database port>
DB_NAME=<Kroombox database name>
DB_USER=<Kroombox application user>
DB_PASSWORD=<protected Kroombox database password>
```

Use `SESSION_COOKIE_SAME_SITE=lax` only when the browser frontend and dedicated API subdomain are confirmed same-site over HTTPS; use `none` with Secure cookies for genuinely cross-site requests. Cookies stay host-only, CORS accepts only exact HTTPS origins, and CSRF protection remains enabled. Production currently requires `TRUST_PROXY=true` and trusts one proxy hop; verify Kroombox's actual proxy chain before setting it. If the chain differs, review the backend configuration rather than trusting all proxies.

Choose one database profile **after** Kroombox confirms its MySQL networking:

| Confirmed database capability | Settings | Safety condition |
| --- | --- | --- |
| MySQL TLS available | `DB_SSL_MODE=required`, `DB_SSL_ALLOW_PRIVATE_NETWORK=false`, `DB_SSL_REJECT_UNAUTHORIZED=true` | Supply `DB_SSL_CA_BASE64` if Kroombox requires a custom CA; otherwise use verified system trust roots. Never retry failed TLS as plaintext. |
| MySQL TLS unavailable and host private-only | `DB_SSL_MODE=disabled`, `DB_SSL_ALLOW_PRIVATE_NETWORK=true`, `DB_SSL_CA_BASE64=` | Set the opt-in only after Kroombox confirms that this database host is reachable exclusively through its private network and is not publicly exposed. The flag itself cannot prove network isolation. |

The current Render/Aiven profile above continues to require verified TLS with the Aiven CA and `SameSite=None`. Do not put database passwords, peppers, Cloudinary secrets, or SMTP credentials in repository files or logs. `/api/v1/health` is process liveness; `/api/v1/ready` checks database, schema, and migration readiness. Do not run migrations or switch provider settings merely to evaluate these profiles.
