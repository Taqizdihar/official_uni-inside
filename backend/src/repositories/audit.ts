import type { Executor } from '../database/pool';
import { rows, write } from '../database/pool';
import type { RowDataPacket } from 'mysql2/promise';
import { redact } from '../utils/security';

export async function audit(db: Executor, data: { actorId?: number | null; action: string; entityType: string; entityId: number; requestId: string; before?: unknown; after?: unknown; ipHash?: string | null; userAgent?: string | null }) {
  await write(db, 'INSERT INTO audit_logs (actor_user_id,action_code,entity_type,entity_id,before_json,after_json,request_id,ip_hash,user_agent) VALUES (?,?,?,?,?,?,?,?,?)', [data.actorId ?? null,data.action,data.entityType,data.entityId,data.before == null ? null : JSON.stringify(redact(data.before)),data.after == null ? null : JSON.stringify(redact(data.after)),data.requestId,data.ipHash ?? null,data.userAgent ?? null]);
}
export async function revision(db: Executor, data: { entityType: string; entityId: number; snapshot: unknown; actorId: number; summary: string }) {
  const safe = JSON.stringify(redact(data.snapshot));
  if (safe.length > 100_000) throw new Error('Content revision is too large');
  const count = await rows<RowDataPacket>(db, 'SELECT COALESCE(MAX(revision_number),0)+1 AS next FROM content_revisions WHERE entity_type=? AND entity_id=? FOR UPDATE', [data.entityType,data.entityId]);
  await write(db, 'INSERT INTO content_revisions (entity_type,entity_id,revision_number,snapshot_json,change_summary,created_by) VALUES (?,?,?,?,?,?)', [data.entityType,data.entityId,Number(count[0]?.next ?? 1),safe,data.summary,data.actorId]);
}
