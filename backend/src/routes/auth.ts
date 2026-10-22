import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Pool } from 'mysql2/promise';
import type { Config } from '../config/env';
import { allowRoles, auth, csrf, csrfToken, permit } from '../middleware/auth';
import { asyncRoute, HttpError, parse } from '../utils/http';
import { clearCsrfCookieOptions, clearSessionCookieOptions, csrfCookieOptions, sessionCookieOptions } from '../utils/security';
import * as service from '../services/auth';
import * as repo from '../repositories/auth';
import { transaction } from '../database/pool';
import { audit } from '../repositories/audit';
import { mediaById } from '../repositories/content';

const id = z.coerce.number().int().positive();
const email = z.email().max(254);
const password = z.string().max(1024);
const token = z.string().min(20).max(200);
const page = z.strictObject({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export function authRoutes(config: Config, db: Pool) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const requireAuth = auth(config, db);
  const requireCsrf = csrf(config);
  const strict = rateLimit({ windowMs: config.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60_000, limit: config.LOGIN_RATE_LIMIT_MAX, standardHeaders: 'draft-8', legacyHeaders: false });
  const adminRoles = allowRoles('super_admin', 'administrator');
  const superAdmin = allowRoles('super_admin');
  const resetLimit = rateLimit({ windowMs: 60 * 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, keyGenerator: req => String(req.actor!.id) });
  router.post('/auth/login', strict, asyncRoute(async (req, res) => {
    const input = parse(z.strictObject({ email, password }), req.body);
    const result = await service.login(db, config, input.email, input.password, { requestId: req.requestId, ip: req.ip, userAgent: req.get('user-agent') });
    res.cookie(config.SESSION_COOKIE_NAME, result.token, sessionCookieOptions(config));
    const csrfValue = csrfToken(config, result.token);
    res.cookie(config.CSRF_COOKIE_NAME, csrfValue, csrfCookieOptions(config));
    res.json({ data: { user: result.user, csrfToken: csrfValue } });
  }));
  router.post('/auth/invitations/accept', strict, asyncRoute(async (req, res) => {
    const input = parse(z.strictObject({ token, password }), req.body);
    res.json({ data: await service.acceptInvite(db, config, input.token, input.password, req.requestId) });
  }));
  router.post('/auth/password-reset/request', strict, asyncRoute(async (req, res) => {
    const input = parse(z.strictObject({ email }), req.body);
    res.json({ data: await service.requestReset(db, config, input.email, req.requestId) });
  }));
  router.post('/auth/password-reset/complete', strict, asyncRoute(async (req, res) => {
    const input = parse(z.strictObject({ token, password }), req.body);
    res.json({ data: await service.completeReset(db, config, input.token, input.password, req.requestId) });
  }));
  router.get('/auth/me', requireAuth, asyncRoute(async (req, res) => {
    const user = await repo.findUserById(db, req.actor!.id);
    res.set('Cache-Control', 'no-store').json({ data: { user, permissions: [...req.actor!.permissions], csrfToken: csrfToken(config, req.sessionToken!), passwordMinLength: config.PASSWORD_MIN_LENGTH } });
  }));
  router.get('/auth/profile',requireAuth,asyncRoute(async (req,res)=>{
    res.set('Cache-Control','no-store').json({data:{user:await repo.findUserById(db,req.actor!.id),profile:await repo.findProfile(db,req.actor!.id)}});
  }));
  router.patch('/auth/profile',requireAuth,requireCsrf,asyncRoute(async (req,res)=>{
    const input=parse(z.strictObject({displayName:z.string().trim().min(1).max(150).optional(),avatarMediaId:id.nullable().optional(),jobTitle:z.string().max(150).nullable().optional(),bio:z.string().max(1000).nullable().optional()}),req.body);
    if (!Object.keys(input).length) throw new HttpError(400,'VALIDATION_ERROR','Provide a profile field.');
    const result=await transaction(db,async conn=>{
      await repo.createProfile(conn,req.actor!.id);
      const before=await repo.findProfile(conn,req.actor!.id);
      if(input.avatarMediaId && !(await mediaById(conn,input.avatarMediaId))) throw new HttpError(400,'INVALID_MEDIA','Select an active image.');
      await repo.updateProfile(conn,req.actor!.id,{avatarMediaId:input.avatarMediaId===undefined?before?.avatar_media_id??null:input.avatarMediaId,jobTitle:input.jobTitle===undefined?before?.job_title??null:input.jobTitle,bio:input.bio===undefined?before?.bio??null:input.bio});
      if(input.displayName)await repo.updateDisplayName(conn,req.actor!.id,input.displayName);
      const after=await repo.findProfile(conn,req.actor!.id);
      await audit(conn,{actorId:req.actor!.id,action:'users.profile.update',entityType:'users',entityId:req.actor!.id,requestId:req.requestId,before,after});
      return {user:await repo.findUserById(conn,req.actor!.id),profile:after};
    });
    res.json({data:result});
  }));
  router.post('/auth/logout', requireAuth, requireCsrf, asyncRoute(async (req, res) => {
    await transaction(db,async conn=>{await repo.revokeSession(conn,req.actor!.sessionId);await audit(conn,{actorId:req.actor!.id,action:'auth.logout',entityType:'users',entityId:req.actor!.id,requestId:req.requestId});});
    res.clearCookie(config.SESSION_COOKIE_NAME, clearSessionCookieOptions(config)); res.clearCookie(config.CSRF_COOKIE_NAME, clearCsrfCookieOptions(config));
    res.json({ data: { loggedOut: true } });
  }));
  router.post('/auth/logout-all', requireAuth, requireCsrf, asyncRoute(async (req, res) => {
    await transaction(db,async conn=>{await repo.revokeUserSessions(conn,req.actor!.id);await audit(conn,{actorId:req.actor!.id,action:'auth.logout.all',entityType:'users',entityId:req.actor!.id,requestId:req.requestId});});
    res.clearCookie(config.SESSION_COOKIE_NAME, clearSessionCookieOptions(config)); res.clearCookie(config.CSRF_COOKIE_NAME, clearCsrfCookieOptions(config));
    res.json({ data: { loggedOut: true } });
  }));
  router.post('/auth/password-change', requireAuth, requireCsrf, asyncRoute(async (req, res) => {
    const input = parse(z.strictObject({ currentPassword: password, newPassword: password }), req.body);
    const result=await service.changePassword(db, config, req.actor!.id, input.currentPassword, input.newPassword, req.requestId);
    res.cookie(config.SESSION_COOKIE_NAME,result.token,sessionCookieOptions(config));
    const csrfValue=csrfToken(config,result.token);
    res.cookie(config.CSRF_COOKIE_NAME,csrfValue,csrfCookieOptions(config));
    res.json({ data:{changed:true,csrfToken:csrfValue} });
  }));

  router.get('/admin/users', requireAuth, adminRoles, permit('users.view'), asyncRoute(async (req, res) => {
    const q = parse(page, req.query);
    const [data,total]=await Promise.all([repo.listUsers(db,q.limit,(q.page-1)*q.limit),repo.countUsers(db)]);
    res.json({ data, meta: {...q,total,totalPages:Math.ceil(total/q.limit)} });
  }));
  router.get('/admin/users/:id', requireAuth, adminRoles, permit('users.view'), asyncRoute(async (req, res) => {
    const user = await repo.findUserById(db, parse(id, req.params.id));
    if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');
    res.json({ data: user });
  }));
  router.patch('/admin/users/:id', requireAuth, requireCsrf, adminRoles, permit('users.update'), asyncRoute(async (req, res) => {
    const input = parse(z.strictObject({ role: z.enum(['super_admin','administrator','editor','author','viewer']), status: z.enum(['active','suspended','disabled']) }), req.body);
    if (input.role === 'super_admin' && !req.actor!.permissions.has('roles.manage')) throw new HttpError(403, 'FORBIDDEN', 'Only role managers can assign super administrator.');
    res.json({ data: await service.updateUser(db, parse(id, req.params.id), input.role, input.status, { actorId: req.actor!.id, actorRole: req.actor!.roleCode, requestId: req.requestId, permissions:req.actor!.permissions }) });
  }));
  router.post('/admin/users/:id/reset-password', requireAuth, requireCsrf, superAdmin, permit('users.update'), resetLimit, asyncRoute(async (req, res) => {
    const input = parse(z.strictObject({ newPassword: password }), req.body);
    res.json({ data: await service.adminResetPassword(db, config, parse(id, req.params.id), input.newPassword, { actorId: req.actor!.id, actorRole: req.actor!.roleCode, requestId: req.requestId }) });
  }));
  router.get('/admin/invitations', requireAuth, adminRoles, permit('users.view'), asyncRoute(async (req, res) => {
    const q = parse(page, req.query); const [data,total]=await Promise.all([repo.listInvitations(db,q.limit,(q.page-1)*q.limit),repo.countInvitations(db)]);res.json({ data, meta: {...q,total,totalPages:Math.ceil(total/q.limit)} });
  }));
  router.post('/admin/invitations', requireAuth, requireCsrf, adminRoles, permit('users.invite'), strict, asyncRoute(async (req, res) => {
    const input = parse(z.strictObject({ email, displayName: z.string().min(1).max(150), role: z.enum(['administrator','editor','author','viewer']) }), req.body);
    res.status(201).json({ data: await service.invite(db, config, input, { actorId: req.actor!.id, requestId: req.requestId }) });
  }));
  router.post('/admin/invitations/:id/resend', requireAuth, requireCsrf, adminRoles, permit('users.invite'), strict, asyncRoute(async (req, res) => {
    res.json({ data: await service.resendInvite(db, config, parse(id, req.params.id), { actorId: req.actor!.id, requestId: req.requestId }) });
  }));
  router.post('/admin/invitations/:id/revoke', requireAuth, requireCsrf, adminRoles, permit('users.invite'), asyncRoute(async (req, res) => {
    const invitationId = parse(id, req.params.id);
    await transaction(db, async conn => {
      const changed = await repo.revokeInvitation(conn, invitationId);
      if (!changed.affectedRows) throw new HttpError(404, 'NOT_FOUND', 'Pending invitation not found.');
      await audit(conn, { actorId: req.actor!.id, action: 'users.invitation.revoke', entityType: 'invitations', entityId: invitationId, requestId: req.requestId });
    });
    res.json({ data: { revoked: true } });
  }));
  router.get('/admin/roles', requireAuth, permit('roles.view'), asyncRoute(async (_req, res) => { res.json({ data: await repo.listRoles(db) }); }));
  router.get('/admin/permissions', requireAuth, permit('roles.view'), asyncRoute(async (_req, res) => { res.json({ data: await repo.listPermissions(db) }); }));
  router.get('/admin/roles/:id/permissions', requireAuth, permit('roles.view'), asyncRoute(async (req,res) => { res.json({data:{permissionIds:await repo.rolePermissionIds(db,parse(id,req.params.id))}}); }));
  router.put('/admin/roles/:id/permissions', requireAuth, requireCsrf, superAdmin, permit('roles.manage'), asyncRoute(async (req, res) => {
    const roleId = parse(id, req.params.id);
    const input = parse(z.strictObject({ permissionIds: z.array(id).max(51) }), req.body);
    const roles = await repo.listRoles(db);
    if (!roles.some(role => Number(role.id) === roleId) || roles.find(role => Number(role.id) === roleId)?.code === 'super_admin') throw new HttpError(400, 'INVALID_ROLE', 'This role cannot be edited.');
    const allowed = new Set((await repo.listPermissions(db)).map(p => Number(p.id)));
    if (input.permissionIds.some(value => !allowed.has(value))) throw new HttpError(400, 'VALIDATION_ERROR', 'Select valid permissions.');
    await transaction(db, async conn => {
      await repo.setRolePermissions(conn, roleId, [...new Set(input.permissionIds)]);
      await audit(conn, { actorId: req.actor!.id, action: 'roles.permissions.update', entityType: 'roles', entityId: roleId, requestId: req.requestId, after: { permissionIds: input.permissionIds } });
    });
    res.json({ data: { roleId, permissionIds: input.permissionIds } });
  }));
  return router;
}
