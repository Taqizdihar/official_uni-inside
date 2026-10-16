import { z } from 'zod';

const bool = z.enum(['true', 'false']).default('false').transform(value => value === 'true');
const positive = (fallback: number) => z.coerce.number().int().positive().default(fallback);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: positive(4000),
  API_BASE_PATH: z.string().regex(/^\/[a-z0-9/-]+$/).default('/api/v1'),
  APP_NAME: z.string().default('Uni-Inside CMS API'),
  PUBLIC_FRONTEND_URL: z.url().default('http://localhost:3000'),
  ADMIN_FRONTEND_URL: z.url().default('http://localhost:3000/admin'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  TRUST_PROXY: bool,
  DB_HOST: z.string().min(1), DB_PORT: positive(3306), DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1), DB_PASSWORD: z.string().default(''),
  DB_CONNECTION_LIMIT: positive(10),
  DB_SSL_MODE: z.enum(['disabled', 'required']).default('disabled'),
  DB_SSL_CA_BASE64: z.string().default(''),
  DB_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
  REQUIRE_LATEST_MIGRATION: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
  SESSION_COOKIE_NAME: z.string().default('uniinside_session'),
  SESSION_COOKIE_SECURE: bool,
  SESSION_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  SESSION_TTL_HOURS: positive(12), SESSION_IDLE_TTL_MINUTES: positive(60),
  CSRF_COOKIE_NAME: z.string().default('uniinside_csrf'),
  AUTH_TOKEN_PEPPER: z.string().min(32), ANALYTICS_HASH_PEPPER: z.string().min(32),
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(12).max(128).default(12),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: positive(15), LOGIN_RATE_LIMIT_MAX: positive(8),
  API_RATE_LIMIT_WINDOW_MINUTES: positive(15), API_RATE_LIMIT_MAX: positive(300),
  ANALYTICS_RETENTION_DAYS: positive(90),
  SMTP_HOST: z.string().default(''), SMTP_PORT: positive(587), SMTP_SECURE: bool,
  SMTP_USER: z.string().default(''), SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('Uni-Inside Studio'), SMTP_FROM_EMAIL: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''), CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''), LOG_LEVEL: z.string().default('info'),
}).superRefine((v, ctx) => {
  if (v.NODE_ENV === 'production' && !v.SESSION_COOKIE_SECURE) ctx.addIssue({ code: 'custom', path: ['SESSION_COOKIE_SECURE'], message: 'Production sessions require Secure cookies' });
  if (v.NODE_ENV === 'production' && (v.AUTH_TOKEN_PEPPER.startsWith('replace-with') || v.ANALYTICS_HASH_PEPPER.startsWith('replace-with'))) ctx.addIssue({ code: 'custom', path: ['AUTH_TOKEN_PEPPER'], message: 'Replace example security peppers before production' });
  if (v.SESSION_COOKIE_SAME_SITE === 'none' && !v.SESSION_COOKIE_SECURE) ctx.addIssue({ code: 'custom', path: ['SESSION_COOKIE_SAME_SITE'], message: 'SameSite=None requires Secure cookies' });
  if (v.DB_SSL_MODE === 'required' && !v.DB_SSL_REJECT_UNAUTHORIZED) ctx.addIssue({ code: 'custom', path: ['DB_SSL_REJECT_UNAUTHORIZED'], message: 'TLS certificate verification is required' });
});

export type Config = z.infer<typeof schema> & { origins: string[] };
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid backend configuration: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const origins = result.data.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length || origins.some(v => !/^https?:\/\/[^/]+$/.test(v))) throw new Error('Invalid CORS_ALLOWED_ORIGINS: use comma-separated origins without paths');
  return { ...result.data, origins };
}
