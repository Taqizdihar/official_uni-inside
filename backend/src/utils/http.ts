import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details: unknown[] = []) { super(message); }
}
export const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, 'VALIDATION_ERROR', 'The request could not be processed.', result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
  return result.data;
}
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  void _next;
  const databaseCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const err = error instanceof HttpError ? error : error instanceof ZodError ? new HttpError(400, 'VALIDATION_ERROR', 'The request could not be processed.') : error && typeof error==='object' && 'type' in error && error.type==='entity.too.large' ? new HttpError(413,'BODY_TOO_LARGE','The request body is too large.') : error instanceof SyntaxError && 'body' in error ? new HttpError(400,'INVALID_JSON','The request body must be valid JSON.') : databaseCode === 'ER_DUP_ENTRY' ? new HttpError(409,'ALREADY_EXISTS','A record with this value already exists.') : databaseCode.startsWith('ER_NO_REFERENCED_ROW') ? new HttpError(400,'INVALID_REFERENCE','A related record was not found.') : databaseCode.startsWith('ER_ROW_IS_REFERENCED') ? new HttpError(409,'ACCOUNT_REFERENCED','Akun ini masih digunakan pada produk. Ganti akun pada produk terkait sebelum menghapusnya.') : null;
  if (!err) req.log?.error({ requestId:req.requestId, errorType: error instanceof Error ? error.name : 'unknown' }, 'request failed');
  if (res.headersSent) return;
  res.status(err?.status ?? 500).json({ error: { code: err?.code ?? 'INTERNAL_ERROR', message: err?.message ?? 'An unexpected error occurred.', details: err?.details ?? [], requestId: req.requestId } });
}
