-- Run on the selected database in DBeaver and export the single result grid as UTF-8 CSV.
-- Read-only. Do not filter rows: category markers prove that empty object groups were inspected.
SELECT category, object_key, attributes FROM (
  SELECT 'MANIFEST' AS category, 'TABLE' AS object_key, '{}' AS attributes
  UNION ALL SELECT 'MANIFEST', 'COLUMN', '{}'
  UNION ALL SELECT 'MANIFEST', 'INDEX', '{}'
  UNION ALL SELECT 'MANIFEST', 'FOREIGN_KEY', '{}'
  UNION ALL SELECT 'MANIFEST', 'CHECK', '{}'
  UNION ALL SELECT 'MANIFEST', 'VIEW', '{}'
  UNION ALL SELECT 'MANIFEST', 'TRIGGER', '{}'
  UNION ALL SELECT 'MANIFEST', 'ROUTINE', '{}'
  UNION ALL SELECT 'MANIFEST', 'EVENT', '{}'
  UNION ALL
  SELECT 'TABLE', t.TABLE_NAME,
    JSON_OBJECT('type',t.TABLE_TYPE,'engine',t.ENGINE,'collation',t.TABLE_COLLATION)
  FROM information_schema.TABLES t WHERE t.TABLE_SCHEMA = DATABASE()
  UNION ALL
  SELECT 'COLUMN', CONCAT(c.TABLE_NAME,'.',LPAD(c.ORDINAL_POSITION,5,'0'),'.',c.COLUMN_NAME),
    JSON_OBJECT('type',c.DATA_TYPE,'column_type',c.COLUMN_TYPE,'nullable',c.IS_NULLABLE,
      'default',c.COLUMN_DEFAULT,'extra',c.EXTRA,'generation',c.GENERATION_EXPRESSION,
      'charset',c.CHARACTER_SET_NAME,'collation',c.COLLATION_NAME,
      'char_length',c.CHARACTER_MAXIMUM_LENGTH,'octet_length',c.CHARACTER_OCTET_LENGTH,
      'numeric_precision',c.NUMERIC_PRECISION,'numeric_scale',c.NUMERIC_SCALE,
      'datetime_precision',c.DATETIME_PRECISION,'srs_id',c.SRS_ID)
  FROM information_schema.COLUMNS c WHERE c.TABLE_SCHEMA = DATABASE()
  UNION ALL
  SELECT 'INDEX', CONCAT(s.TABLE_NAME,'.',s.INDEX_NAME,'.',LPAD(s.SEQ_IN_INDEX,5,'0')),
    JSON_OBJECT('column',s.COLUMN_NAME,'expression',s.EXPRESSION,'non_unique',s.NON_UNIQUE,
      'index_type',s.INDEX_TYPE,'prefix_length',s.SUB_PART,'collation',s.COLLATION,
      'nullable',s.NULLABLE,'visible',s.IS_VISIBLE)
  FROM information_schema.STATISTICS s WHERE s.TABLE_SCHEMA = DATABASE()
  UNION ALL
  SELECT 'FOREIGN_KEY', CONCAT(k.TABLE_NAME,'.',k.CONSTRAINT_NAME,'.',LPAD(k.ORDINAL_POSITION,5,'0')),
    JSON_OBJECT('column',k.COLUMN_NAME,'referenced_table',k.REFERENCED_TABLE_NAME,
      'referenced_column',k.REFERENCED_COLUMN_NAME,'referenced_position',k.POSITION_IN_UNIQUE_CONSTRAINT,
      'delete_rule',r.DELETE_RULE,'update_rule',r.UPDATE_RULE,'match_option',r.MATCH_OPTION)
  FROM information_schema.KEY_COLUMN_USAGE k
  JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
    AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
  WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL
  UNION ALL
  SELECT 'CHECK', CONCAT(tc.TABLE_NAME,'.',tc.CONSTRAINT_NAME),
    JSON_OBJECT('clause',cc.CHECK_CLAUSE,'enforced',tc.ENFORCED)
  FROM information_schema.TABLE_CONSTRAINTS tc
  JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA
    AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME
  WHERE tc.TABLE_SCHEMA=DATABASE() AND tc.CONSTRAINT_TYPE='CHECK'
  UNION ALL
  SELECT 'VIEW', v.TABLE_NAME,
    JSON_OBJECT('definition',v.VIEW_DEFINITION,'check_option',v.CHECK_OPTION,'updatable',v.IS_UPDATABLE,
      'security_type',v.SECURITY_TYPE,'definer',v.DEFINER)
  FROM information_schema.VIEWS v WHERE v.TABLE_SCHEMA=DATABASE()
  UNION ALL
  SELECT 'TRIGGER', CONCAT(tr.EVENT_OBJECT_TABLE,'.',tr.TRIGGER_NAME),
    JSON_OBJECT('event',tr.EVENT_MANIPULATION,'timing',tr.ACTION_TIMING,'statement',tr.ACTION_STATEMENT,
      'order',tr.ACTION_ORDER,'definer',tr.DEFINER)
  FROM information_schema.TRIGGERS tr WHERE tr.TRIGGER_SCHEMA=DATABASE()
  UNION ALL
  SELECT 'ROUTINE', CONCAT(ro.ROUTINE_TYPE,'.',ro.ROUTINE_NAME),
    JSON_OBJECT('type',ro.ROUTINE_TYPE,'definition',ro.ROUTINE_DEFINITION,
      'data_access',ro.SQL_DATA_ACCESS,'deterministic',ro.IS_DETERMINISTIC,
      'security_type',ro.SECURITY_TYPE,'definer',ro.DEFINER)
  FROM information_schema.ROUTINES ro WHERE ro.ROUTINE_SCHEMA=DATABASE()
  UNION ALL
  SELECT 'EVENT', e.EVENT_NAME,
    JSON_OBJECT('definition',e.EVENT_DEFINITION,'status',e.STATUS,'schedule_type',e.EVENT_TYPE,
      'execute_at',e.EXECUTE_AT,'interval_value',e.INTERVAL_VALUE,'interval_field',e.INTERVAL_FIELD,
      'starts',e.STARTS,'ends',e.ENDS,'definer',e.DEFINER)
  FROM information_schema.EVENTS e WHERE e.EVENT_SCHEMA=DATABASE()
) audit ORDER BY category, object_key;
