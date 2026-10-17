# Uni-Inside Studio

Official website repository for **Uni-Inside Studio**, a Bandung-based creative technology startup working across multimedia production, digital solutions, and creative products.

**Uni-Inside Studio** is the official startup name. **Uni-Inside Craft** is its product division focused on custom 3D printing, merchandise, and creative souvenirs.

Website: [uniinside.net](https://uniinside.net)

## Technology stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Motion
- GSAP
- React Three Fiber / Three.js
- Lottie

## Local development

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

The development server runs on `http://localhost:3000` by default.

The CMS REST API is a separate Node package under [`backend/`](backend/README.md). The frontend and backend have separate lockfiles and builds. Published API content replaces static public data; when the API is offline, the existing static content remains available.

### Phase 2 local CMS workflow

Create `backend/.env` from `backend/.env.example` on your machine and configure the local MySQL 8/Laragon connection, two distinct security peppers, and optional Cloudinary credentials. `VITE_API_BASE_URL=http://localhost:4000/api/v1` is the root frontend default; set it in a local root `.env` if the backend uses another address. Never commit either real `.env` file.

Terminal 1, from the repository root:

```bash
cd backend
npm ci
npm run db:status
npm run db:migrate
npm run db:check
npm run dev
```

Terminal 2, from the repository root:

```bash
npm ci
npm run dev
```

Open the public site at `http://localhost:3000`, CMS login at `http://localhost:3000/admin/login`, API at `http://localhost:4000`, liveness at `http://localhost:4000/api/v1/health`, and database readiness at `http://localhost:4000/api/v1/ready`. If no administrator exists, create one using the password-stdin command in [backend/README.md](backend/README.md). There is no public registration.

Sign in, save a draft, upload an image through the CMS media picker, complete the publishing requirements, and publish. The picker requests a short-lived signature, uploads directly to Cloudinary, then asks the backend to verify and record it in MySQL. `CLOUDINARY_ROOT_FOLDER` defaults to `uni-inside`; the backend controls subfolders. Manually uploaded Cloudinary images do not automatically become CMS media records. Cloudinary is external storage even when MySQL is local. SMTP can remain empty for local development; development-only invitation/reset links then appear in the API response.

Phase 2 adds local CMS and public integration only. Cloudflare Pages, Render, and Aiven deployment is reserved for Phase 3.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run TypeScript type checking |
| `npm run clean` | Remove generated build output |

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Main landing page |
| `/media-kit` | Brand introduction and downloadable assets |
| `/products` | Uni-Inside Craft product catalogue |
| `/services` | Uni-Inside Studio service overview |
| `/news` | News and insights listing |
| `/products/:slug`, `/services/:slug`, `/projects/:slug`, `/news/:slug` | Published CMS detail templates |
| `/projects` | Published project listing |
| `/admin/login` | CMS sign-in |
| `/admin/dashboard`, `/admin/analytics` | Authenticated overview |
| `/admin/homepage/*`, `/admin/content/*`, `/admin/site/*` | Permission-aware CMS editors |
| `/admin/media`, `/admin/users`, `/admin/roles`, `/admin/audit`, `/admin/profile` | Media and administration |

The `/admin/*` application, rich-text editor, and admin analytics chart are lazy-loaded so the landing page does not download them initially. DOMPurify is the only new runtime dependency; it sanitizes rich-text previews and public detail content. The backend still performs authoritative sanitation.

## Project structure

```text
src/
├── assets/       Static visual, audio, 3D, and animation assets
├── components/   Reusable landing-page and shared UI components
├── data/         Temporary static content sources
├── hooks/        Shared React hooks
├── pages/        Routed pages
├── admin/        Lazy-loaded CMS interface and API client
├── public/       Public content provider and first-party analytics
├── App.tsx       Main landing-page composition
└── main.tsx      Router and application bootstrap
public/           Public static assets
backend/          Independent CMS API, MySQL migration, tests, and deployment docs
```

## Content status

The current repository contains a mixture of production UI and temporary static content. In particular:

- News entries are mock content.
- Achievement entries are placeholders and are not verified public claims.
- Some team roles and biographies are temporary.
- New detail pages are functional templates that require published CMS records.

Do not publish placeholder content as factual company information. Replace it with verified content through the planned CMS before treating the site as production-complete.

## Environment variables and secret safety

Use `.env.example` only as documentation. Never commit real credentials.

Vite variables prefixed with `VITE_` are bundled into client-side code and must never contain private API keys or server credentials. `VITE_API_BASE_URL` is a public API URL; secrets belong only in the backend.

## Deployment

The application is a client-side React SPA. Production hosting must:

1. run `npm run build`;
2. serve the generated `dist/` directory;
3. rewrite unknown application routes to `index.html`;
4. use HTTPS for `https://uniinside.net`;
5. preserve long-term caching for hashed assets while keeping HTML revalidation enabled.

## Repository hygiene

Do not commit:

- local browser profiles;
- cookies, login databases, or session storage;
- generated screenshots and caches;
- environment files containing secrets;
- temporary patch or debugging scripts;
- build output.

These paths are covered by `.gitignore`.

## Contributing

1. Work from the latest `main`.
2. Keep content claims factual and verifiable.
3. Preserve the official names **Uni-Inside Studio** and **Uni-Inside Craft**.
4. Run `npm run lint` and `npm run build` before merging.
5. Keep unrelated changes out of the same commit.
