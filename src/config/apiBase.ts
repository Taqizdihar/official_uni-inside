import {resolveFrontendApiBase} from './resolveApiBase';

export const API_BASE = resolveFrontendApiBase(
  {VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL},
  import.meta.env.PROD
);
