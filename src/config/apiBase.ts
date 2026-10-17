import {resolveApiBase} from './resolveApiBase';

export const API_BASE = resolveApiBase({VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL}, import.meta.env.PROD);
