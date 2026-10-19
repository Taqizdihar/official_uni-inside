import type { Logger } from 'pino';
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log?: Logger;
      sessionToken?: string;
      actor?: { id: number; roleId: number; roleCode: string; permissions: Set<string>; sessionId: number };
    }
  }
}
export {};
