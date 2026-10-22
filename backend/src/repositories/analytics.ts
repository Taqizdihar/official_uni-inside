import type { Executor } from '../database/pool';
import { rows, write } from '../database/pool';
import type { RowDataPacket } from 'mysql2/promise';

export const insertEvent = (db: Executor, item: { uuid:string; name:string; path:string | null; entityType:string | null; entityId:number | null; destination:string | null; referrer:string | null; visitorHash:string | null; device:string }) => write(db, 'INSERT IGNORE INTO analytics_events (event_uuid,event_name,occurred_at,page_path,entity_type,entity_id,link_destination,referrer_host,visitor_hash,device_type) VALUES (?,?,UTC_TIMESTAMP(3),?,?,?,?,?,?,?)', [item.uuid,item.name,item.path,item.entityType,item.entityId,item.destination,item.referrer,item.visitorHash,item.device]);
export async function dashboard(db: Executor) {
  const tables = ['products','services','projects','news_articles','team_members','partners','achievements'] as const;
  const counts: Record<string,{published:number;draft:number}> = {};
  for (const table of tables) {
    const result = await rows<RowDataPacket>(db, `SELECT SUM(status='published') AS published,SUM(status='draft') AS draft FROM \`${table}\` WHERE deleted_at IS NULL`);
    counts[table] = { published:Number(result[0]?.published??0),draft:Number(result[0]?.draft??0) };
  }
  const month = (await rows<RowDataPacket>(db,"SELECT COUNT(*) AS events,COUNT(DISTINCT visitor_hash) AS visitors FROM analytics_events WHERE occurred_at>=DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-01')"))[0];
  const mostViewed = await rows<RowDataPacket>(db,"SELECT event_name,entity_type,entity_id,COUNT(*) AS views FROM analytics_events WHERE event_name IN ('product_view','service_view','news_view') GROUP BY event_name,entity_type,entity_id ORDER BY views DESC LIMIT 20");
  const mostClicked = await rows<RowDataPacket>(db,"SELECT entity_id,link_destination,COUNT(*) AS clicks FROM analytics_events WHERE event_name='product_purchase_link_click' GROUP BY entity_id,link_destination ORDER BY clicks DESC LIMIT 20");
  const recentChanges = await rows<RowDataPacket>(db,'SELECT id,actor_user_id,action_code,entity_type,entity_id,request_id,created_at FROM audit_logs ORDER BY id DESC LIMIT 15');
  return { counts,month:{events:Number(month?.events??0),visitors:Number(month?.visitors??0)},mostViewed,mostClicked,recentChanges };
}
export const analyticsSummary = (db: Executor) => rows<RowDataPacket>(db,"SELECT metric_date,metric_name,entity_type,entity_id,dimension_key,dimension_value,metric_value FROM analytics_daily_metrics WHERE metric_date >= DATE_SUB(UTC_DATE(), INTERVAL 90 DAY) ORDER BY metric_date DESC LIMIT 500");
export const auditList = (db: Executor,limit:number,offset:number) => rows<RowDataPacket>(db,'SELECT a.id,a.actor_user_id,u.display_name AS actor_name,a.action_code,a.entity_type,a.entity_id,CASE WHEN a.entity_type=\'users\' THEN target.display_name ELSE NULL END AS target_name,a.request_id,a.created_at FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id LEFT JOIN users target ON target.id=a.entity_id AND a.entity_type=\'users\' ORDER BY a.id DESC LIMIT ? OFFSET ?',[limit,offset]);
export const auditCount = async (db: Executor) => Number((await rows<RowDataPacket>(db,'SELECT COUNT(*) AS total FROM audit_logs'))[0]?.total ?? 0);
export const revisionList = (db: Executor,entityType:string,entityId:number) => rows<RowDataPacket>(db,'SELECT id,revision_number,change_summary,created_by,created_at FROM content_revisions WHERE entity_type=? AND entity_id=? ORDER BY revision_number DESC LIMIT 100',[entityType,entityId]);
export const revisionRecord = async (db: Executor,id:number,entityType:string,entityId:number) => (await rows<RowDataPacket>(db,'SELECT id,snapshot_json FROM content_revisions WHERE id=? AND entity_type=? AND entity_id=? LIMIT 1',[id,entityType,entityId]))[0];
export async function rollup(db: Executor, retentionDays:number) {
  await write(db, `INSERT INTO analytics_daily_metrics (metric_date,metric_name,entity_type,entity_id,dimension_key,dimension_value,metric_value)
    SELECT DATE(occurred_at),event_name,COALESCE(entity_type,''),COALESCE(entity_id,0),'','',COUNT(*) FROM analytics_events
    WHERE occurred_at>=DATE_SUB(UTC_DATE(), INTERVAL ? DAY) GROUP BY DATE(occurred_at),event_name,entity_type,entity_id
    ON DUPLICATE KEY UPDATE metric_value=VALUES(metric_value),updated_at=UTC_TIMESTAMP(3)`,[retentionDays]);
  await write(db,'DELETE FROM analytics_events WHERE occurred_at<DATE_SUB(UTC_DATE(), INTERVAL ? DAY)',[retentionDays]);
}
