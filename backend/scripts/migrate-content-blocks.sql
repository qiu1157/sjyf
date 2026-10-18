-- US-031：服务内容块式编排 —— 生产库增量迁移脚本（MySQL 8.0）
-- 说明：仅新增 content_blocks 列，存量数据零影响（历史 content 纯文本/HTML 值保留）
-- 执行：mysql -u<user> -p <dbname> < migrate-content-blocks.sql
-- 幂等：若列已存在会报 Duplicate column name，可忽略（或先执行下方查询确认）

-- 1) 新增块式详情 JSON 列
ALTER TABLE service_items
  ADD COLUMN content_blocks TEXT NULL COMMENT '块式详情JSON（{"version":1,"blocks":[...]}）'
  AFTER content;

-- 2) 校验（应返回 1 行）
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
--   FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = DATABASE()
--    AND TABLE_NAME = 'service_items'
--    AND COLUMN_NAME = 'content_blocks';

-- 回滚（如确需撤销）
-- ALTER TABLE service_items DROP COLUMN content_blocks;
