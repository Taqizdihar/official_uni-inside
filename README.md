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

The CMS REST API is a separate Node package under [`backend/`](backend/README.md). Install and run it from that directory; the current React pages still use their existing static content. The frontend and backend have separate lockfiles and builds.

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

Product, service, project, and article detail routes are planned as part of the CMS implementation.

## Project structure

```text
src/
├── assets/       Static visual, audio, 3D, and animation assets
├── components/   Reusable landing-page and shared UI components
├── data/         Temporary static content sources
├── hooks/        Shared React hooks
├── pages/        Routed pages
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
- Product and service detail pages are not yet implemented.

Do not publish placeholder content as factual company information. Replace it with verified content through the planned CMS before treating the site as production-complete.

## Environment variables and secret safety

Use `.env.example` only as documentation. Never commit real credentials.

Vite variables prefixed with `VITE_` are bundled into client-side code and must never contain private API keys or server credentials. Any future integration requiring a secret must run through a protected server-side service.

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
