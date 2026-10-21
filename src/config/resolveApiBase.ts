type ApiBaseEnvironment = { VITE_API_BASE_URL?: string };

const LOCAL_API_BASE = 'http://localhost:4000/api/v1';

export function resolveApiBase(environment: ApiBaseEnvironment, production: boolean): string {
  const configured = environment.VITE_API_BASE_URL?.trim();
  if (!configured && production) {
    throw new Error('VITE_API_BASE_URL must be set to the production API URL before building the frontend.');
  }
  const candidate = (configured || LOCAL_API_BASE).replace(/\/+$/, '');
  if (candidate.startsWith('/')) {
    if (candidate !== '/api/v1' || candidate.startsWith('//')) {
      throw new Error('VITE_API_BASE_URL must be an absolute API URL or /api/v1.');
    }
    return candidate;
  }
  let url: URL;
  try { url = new URL(candidate); } catch {
    throw new Error('VITE_API_BASE_URL must be a valid URL.');
  }
  if (url.username || url.password) throw new Error('VITE_API_BASE_URL must not contain embedded credentials.');
  if (production && url.protocol !== 'https:') throw new Error('VITE_API_BASE_URL must use HTTPS in production.');
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/api/v1' || url.search || url.hash) {
    throw new Error('VITE_API_BASE_URL must point to the /api/v1 endpoint.');
  }
  return candidate;
}

/**
 * Temporary official-hosting contingency.
 * Kroombox Fullstack may inject VITE_API_BASE_URL=/api/v1 at build time.
 * Keep production browser requests on the established Render API instead of
 * routing through the Kroombox same-origin gateway.
 * Remove this override when the official backend is ready to replace Render.
 */
export const PRODUCTION_RENDER_API_BASE = 'https://uni-inside-studio-landing-page.onrender.com/api/v1';

export function resolveFrontendApiBase(environment: ApiBaseEnvironment, production: boolean): string {
  return production ? PRODUCTION_RENDER_API_BASE : resolveApiBase(environment, false);
}
