import type { Pool } from 'mysql2/promise';
import type { Config } from '../config/env';
import { transaction } from '../database/pool';
import * as repo from '../repositories/auth';
import { audit } from '../repositories/audit';
import { sendLink } from './mail';
import { hashPassword, hashToken, newToken, validatePassword, verifyPassword } from '../utils/security';
import { HttpError } from '../utils/http';

type Context = { actorId?: number; actorRole?: string; requestId: string; ip?: string; userAgent?: string; permissions?: Set<string> };
const badAuth = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
const validPassword = (value: string, config: Config) => { try { validatePassword(value, config.PASSWORD_MIN_LENGTH); } catch { throw new HttpError(400, 'WEAK_PASSWORD', `Choose a password between ${config.PASSWORD_MIN_LENGTH} and 1024 characters that is not easily guessed.`); } };
const expires = (value: unknown) => new Date(`${String(value).replace(' ', 'T')}Z`).getTime() > Date.now();
export async function login(db: Pool, config: Config, email: string, password: string, ctx: Context) {
  const user = await repo.findUserByEmail(db, email.toLowerCase());
  if (!user?.password_hash || user.status !== 'active') {
    await hashPassword(password); // Equalize the expensive verification path for unknown users.
    throw badAuth();
  }
  if (!(await verifyPassword(String(user.password_hash), password))) throw badAuth();
  const token = newToken();
  await transaction(db, async conn => {
    const current = await repo.lockUser(conn, Number(user.id));
    if (!current || current.status !== 'active' || current.password_hash !== user.password_hash) throw badAuth();
    await repo.createSession(conn, Number(user.id), hashToken(token, config.AUTH_TOKEN_PEPPER), ctx.ip ? hashToken(ctx.ip, config.ANALYTICS_HASH_PEPPER) : null, ctx.userAgent?.slice(0, 500) ?? null, config.SESSION_TTL_HOURS);
    await repo.markLogin(conn, Number(user.id));
    await audit(conn, { actorId: Number(user.id), action: 'auth.login', entityType: 'users', entityId: Number(user.id), requestId: ctx.requestId });
  });
  return { token, user: { id: Number(user.id), email: user.email, displayName: user.display_name, role: user.role_code } };
}
export async function invite(db: Pool, config: Config, input: { email: string; displayName: string; role: string }, ctx: Context) {
  if (config.NODE_ENV === 'production' && (!config.SMTP_HOST || !config.SMTP_FROM_EMAIL)) throw new HttpError(503, 'INTEGRATION_NOT_CONFIGURED', 'Email delivery is not configured.');
  const email = input.email.toLowerCase();
  const existing = await repo.findUserByEmail(db, email);
  if (existing && existing.status !== 'invited') throw new HttpError(409, 'USER_EXISTS', 'An account with this email already exists.');
  const role = await repo.findRole(db, input.role);
  if (!role) throw new HttpError(400, 'VALIDATION_ERROR', 'Select a valid role.');
  const token = newToken();
  const result = await transaction(db, async conn => {
    const created = existing ? Number(existing.id) : Number((await repo.createInvitedUser(conn, email, Number(role.id), input.displayName, ctx.actorId!)).insertId);
    await repo.createProfile(conn, created);
    await repo.revokePendingInvitations(conn,email);
    const invitation = await repo.createInvitation(conn, email, Number(role.id), hashToken(token, config.AUTH_TOKEN_PEPPER), ctx.actorId!);
    await audit(conn, { actorId: ctx.actorId, action: 'users.invite', entityType: 'users', entityId: created, requestId: ctx.requestId, after: { email, role: input.role } });
    return Number(invitation.insertId);
  });
  const url = `${config.ADMIN_FRONTEND_URL.replace(/\/$/, '')}/accept-invitation?token=${encodeURIComponent(token)}`;
  const sent = await sendLink(config, email, 'Uni-Inside invitation', url);
  return { id: result, email, ...(sent ? {} : { developmentUrl: url }) };
}
export async function resendInvite(db: Pool, config: Config, id: number, ctx: Context) {
  if (config.NODE_ENV === 'production' && (!config.SMTP_HOST || !config.SMTP_FROM_EMAIL)) throw new HttpError(503, 'INTEGRATION_NOT_CONFIGURED', 'Email delivery is not configured.');
  const token = newToken();
  const email = await transaction(db, async conn => {
    const old = await repo.findInvitationById(conn, id);
    if (!old || old.accepted_at || old.revoked_at) throw new HttpError(404, 'NOT_FOUND', 'Pending invitation not found.');
    await repo.revokePendingInvitations(conn,String(old.email));
    await repo.createInvitation(conn, String(old.email), Number(old.role_id), hashToken(token, config.AUTH_TOKEN_PEPPER), ctx.actorId!);
    await audit(conn, { actorId: ctx.actorId, action: 'users.invitation.resend', entityType: 'invitations', entityId: id, requestId: ctx.requestId });
    return String(old.email);
  });
  const url = `${config.ADMIN_FRONTEND_URL.replace(/\/$/, '')}/accept-invitation?token=${encodeURIComponent(token)}`;
  const sent = await sendLink(config, email, 'Uni-Inside invitation', url);
  return { resent: true, ...(sent ? {} : { developmentUrl: url }) };
}
export async function acceptInvite(db: Pool, config: Config, token: string, password: string, requestId: string) {
  validPassword(password, config);
  const hash = await hashPassword(password);
  return transaction(db, async conn => {
    const invitation = await repo.findInvitation(conn, hashToken(token, config.AUTH_TOKEN_PEPPER));
    if (!invitation || invitation.accepted_at || invitation.revoked_at || !expires(invitation.expires_at)) throw new HttpError(400, 'TOKEN_INVALID', 'This invitation is invalid or expired.');
    const changed = await repo.activateInvitedUser(conn, String(invitation.email), Number(invitation.role_id), hash);
    if (changed.affectedRows !== 1) throw new HttpError(409, 'INVITATION_CONFLICT', 'This invitation cannot be accepted.');
    await repo.acceptInvitation(conn, Number(invitation.id));
    const user = await repo.findUserByEmail(conn, String(invitation.email));
    await audit(conn, { actorId: Number(user?.id), action: 'auth.invitation.accept', entityType: 'users', entityId: Number(user?.id), requestId });
    return { accepted: true };
  });
}
export async function requestReset(db: Pool, config: Config, email: string, requestId: string) {
  if (config.NODE_ENV === 'production' && (!config.SMTP_HOST || !config.SMTP_FROM_EMAIL)) throw new HttpError(503, 'INTEGRATION_NOT_CONFIGURED', 'Email delivery is not configured.');
  const user = await repo.findUserByEmail(db, email.toLowerCase());
  const generic = { message: 'If an active account exists, a reset link will be sent.' };
  if (!user || user.status !== 'active') return generic;
  const token = newToken();
  await transaction(db, async conn => {
    await repo.createReset(conn, Number(user.id), hashToken(token, config.AUTH_TOKEN_PEPPER));
    await audit(conn, { actorId: Number(user.id), action: 'auth.reset.request', entityType: 'users', entityId: Number(user.id), requestId });
  });
  const url = `${config.ADMIN_FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const sent = await sendLink(config, String(user.email), 'Uni-Inside password reset', url);
  return { ...generic, ...(sent ? {} : { developmentUrl: url }) };
}
export async function completeReset(db: Pool, config: Config, token: string, password: string, requestId: string) {
  validPassword(password, config);
  const hash = await hashPassword(password);
  return transaction(db, async conn => {
    const tokenHash = hashToken(token, config.AUTH_TOKEN_PEPPER);
    const candidate = await repo.findResetCandidate(conn, tokenHash);
    if (!candidate) throw new HttpError(400, 'TOKEN_INVALID', 'This reset link is invalid or expired.');
    // Both reset flows lock the user first, then tokens, so an administrator reset
    // cannot race a self-service link into overwriting the newer password.
    if (!(await repo.lockUser(conn, Number(candidate.user_id)))) throw new HttpError(400, 'TOKEN_INVALID', 'This reset link is invalid or expired.');
    const reset = await repo.findReset(conn, tokenHash);
    if (!reset || reset.used_at || !expires(reset.expires_at)) throw new HttpError(400, 'TOKEN_INVALID', 'This reset link is invalid or expired.');
    await repo.setPassword(conn, Number(reset.user_id), hash);
    await repo.consumeReset(conn, Number(reset.id));
    await repo.revokeUserSessions(conn, Number(reset.user_id));
    await audit(conn, { actorId: Number(reset.user_id), action: 'auth.reset.complete', entityType: 'users', entityId: Number(reset.user_id), requestId });
    return { reset: true };
  });
}
export async function changePassword(db: Pool, config: Config, userId: number, current: string, next: string, requestId: string) {
  validPassword(next, config);
  const token = newToken();
  const result = await transaction(db, async conn => {
    const user = await repo.findUserByEmail(conn, String((await repo.findUserById(conn, userId))?.email));
    if (!user?.password_hash || !(await verifyPassword(String(user.password_hash), current))) throw badAuth();
    await repo.setPassword(conn, userId, await hashPassword(next));
    await repo.revokeUserSessions(conn, userId);
    await repo.createSession(conn,userId,hashToken(token,config.AUTH_TOKEN_PEPPER),null,null,config.SESSION_TTL_HOURS);
    await audit(conn, { actorId: userId, action: 'auth.password.change', entityType: 'users', entityId: userId, requestId });
    return { changed: true, token };
  });
  return result;
}
export async function updateUser(db: Pool, id: number, roleCode: string, status: string, ctx: Context) {
  return transaction(db, async conn => {
    const user = await repo.lockUser(conn, id);
    const role = await repo.findRole(conn, roleCode);
    if (!user || !role) throw new HttpError(404, 'NOT_FOUND', 'User or role not found.');
    if (ctx.actorId === id && ctx.actorRole === 'super_admin' && (roleCode !== user.role_code || status !== user.status)) throw new HttpError(403, 'SELF_ADMIN_CHANGE_FORBIDDEN', 'Your super administrator role and status cannot be changed here.');
    if (ctx.actorRole !== 'super_admin' && (user.role_code === 'super_admin' || roleCode === 'super_admin')) throw new HttpError(403, 'FORBIDDEN', 'Only a super administrator can change this account.');
    if ((user.role_code === 'super_admin' || roleCode === 'super_admin') && !ctx.permissions?.has('roles.manage')) throw new HttpError(403,'FORBIDDEN','Only role managers can change super administrator accounts.');
    if (user.role_code === 'super_admin' && (roleCode !== 'super_admin' || status !== 'active') && await repo.countActiveSuperAdmins(conn) <= 1) throw new HttpError(409, 'LAST_SUPER_ADMIN', 'The last active super administrator cannot be removed.');
    await repo.updateUser(conn, id, Number(role.id), status);
    if (status !== 'active') await repo.revokeUserSessions(conn, id);
    await audit(conn, { actorId: ctx.actorId, action: 'users.update', entityType: 'users', entityId: id, requestId: ctx.requestId, before: { role: user.role_code, status: user.status }, after: { role: roleCode, status } });
    return { id, role: roleCode, status };
  });
}
export async function adminResetPassword(db: Pool, config: Config, id: number, next: string, ctx: Context) {
  if (ctx.actorRole !== 'super_admin') throw new HttpError(403, 'FORBIDDEN', 'Only a super administrator can reset a member password.');
  if (ctx.actorId === id) throw new HttpError(403, 'SELF_ADMIN_CHANGE_FORBIDDEN', 'Use your own profile to change your password.');
  validPassword(next, config);
  const hash = await hashPassword(next);
  return transaction(db, async conn => {
    const user = await repo.lockUser(conn, id);
    if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');
    if (user.role_code === 'super_admin' || user.status === 'invited' || !user.password_hash) throw new HttpError(403, 'RESET_TARGET_FORBIDDEN', 'This account is not eligible for administrative reset.');
    await repo.setPassword(conn, id, hash);
    await repo.revokeUserSessions(conn, id);
    await repo.invalidateUserResets(conn, id);
    await audit(conn, { actorId: ctx.actorId, action: 'users.password.admin_reset', entityType: 'users', entityId: id, requestId: ctx.requestId });
    return { reset: true };
  });
}
