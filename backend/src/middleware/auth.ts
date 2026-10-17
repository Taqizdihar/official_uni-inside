import type { NextFunction, Request, Response } from 'express';
import type { Config } from '../config/env';
import type { Database } from '../database/pool';
import { findSession, permissionsForRole, revokeSession, touchSession } from '../repositories/auth';
import { clearSessionCookieOptions, equalHash, hashToken } from '../utils/security';
import { HttpError } from '../utils/http';

export function auth(config: Config, db: Database) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[config.SESSION_COOKIE_NAME];
      if (typeof token !== 'string' || token.length > 200) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.');
      const session = await findSession(db, hashToken(token, config.AUTH_TOKEN_PEPPER));
      if (!session) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.');
      const idle = Date.now() - new Date(`${String(session.last_activity_at).replace(' ', 'T')}Z`).getTime();
      if (idle > config.SESSION_IDLE_TTL_MINUTES * 60_000) {
        await revokeSession(db, Number(session.session_id));
        res.clearCookie(config.SESSION_COOKIE_NAME, clearSessionCookieOptions(config));
        throw new HttpError(401, 'SESSION_EXPIRED', 'Please sign in again.');
      }
      const permissions = await permissionsForRole(db, Number(session.role_id));
      req.actor = { id: Number(session.user_id), roleId: Number(session.role_id), roleCode: String(session.role_code), sessionId: Number(session.session_id), permissions: new Set(permissions.map(p => String(p.code))) };
      req.sessionToken = token;
      await touchSession(db, Number(session.session_id));
      next();
    } catch (err) { next(err); }
  };
}
export function permit(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.actor) return next(new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.'));
    if (!req.actor.permissions.has(permission)) return next(new HttpError(403, 'FORBIDDEN', 'You do not have permission for this action.'));
    next();
  };
}
export function csrf(config: Config) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (!req.sessionToken) return next(new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.'));
    const expected = hashToken(`csrf:${req.sessionToken}`, config.AUTH_TOKEN_PEPPER);
    const cookie = req.cookies?.[config.CSRF_COOKIE_NAME];
    const header = req.get('x-csrf-token');
    if (typeof cookie !== 'string' || typeof header !== 'string' || !equalHash(cookie,expected) || !equalHash(header,expected)) return next(new HttpError(403, 'CSRF_INVALID', 'The request could not be verified.'));
    next();
  };
}
export function csrfToken(config: Config, token: string) { return hashToken(`csrf:${token}`, config.AUTH_TOKEN_PEPPER); }
