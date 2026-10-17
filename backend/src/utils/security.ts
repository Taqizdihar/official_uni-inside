import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import type { Config } from '../config/env';

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string, pepper: string) => createHmac('sha256', pepper).update(token).digest('hex');
export const equalHash = (left: string, right: string) => {
  const a = Buffer.from(left, 'hex'); const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};
export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id });
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);
export function validatePassword(password: string, min: number) {
  if (password.length < min || password.length > 1024 || /^\s+$/.test(password) || /^(password|123456|qwerty)/i.test(password)) throw new Error(`Password must be ${min}–1024 characters and not trivially weak`);
}
export function sessionCookieOptions(config: Config) {
  return { httpOnly: true as const, secure: config.SESSION_COOKIE_SECURE, sameSite: config.SESSION_COOKIE_SAME_SITE, path: '/', maxAge: config.SESSION_TTL_HOURS * 3_600_000 };
}
export function csrfCookieOptions(config: Config) {
  return { httpOnly: false as const, secure: config.SESSION_COOKIE_SECURE, sameSite: config.SESSION_COOKIE_SAME_SITE, path: '/', maxAge: config.SESSION_TTL_HOURS * 3_600_000 };
}
export function clearSessionCookieOptions(config: Config) {
  const { httpOnly, secure, sameSite, path } = sessionCookieOptions(config);
  return { httpOnly, secure, sameSite, path };
}
export function clearCsrfCookieOptions(config: Config) {
  const { httpOnly, secure, sameSite, path } = csrfCookieOptions(config);
  return { httpOnly, secure, sameSite, path };
}
const secretKeys = /password|token|secret|cookie|authorization|credential|private|smtp|pepper|before_json|after_json/i;
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secretKeys.test(key) ? '[REDACTED]' : redact(item)]));
  return value;
}
