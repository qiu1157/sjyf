-- US-038：服务档案结构化 —— 生产库增量迁移脚本（MySQL 8.0）
-- 说明：仅新增 5 个结构化字段列（全部 int NULL），存量数据零影响；
--       空值语义：service_mode 空=未填写 / people_count 空=不限 / area_max 空=不限 /
--                 price_unit 空=面议 / validity_days 空=长期有效
-- 执行：mysql --default-character-set=utf8mb4 -u<user> -p <dbname> < migrate-service-structured-fields.sql
-- 幂等：若列已存在会报 Duplicate column name，可忽略（或先执行下方查询确认）
-- 字符集：显式声明 utf8mb4，避免中文列注释乱码

SET NAMES utf8mb4;

-- 1) 新增结构化字段列（AFTER notice 依次排开，保持列顺序稳定）
ALTER TABLE service_items
  ADD COLUMN service_mode INT NULL COMMENT '服务方式：1 上门服务 / 2 到店服务 / 3 上门或到店均可' AFTER notice,
  ADD COLUMN people_count INT NULL COMMENT '服务人数上限（人），空=不限' AFTER service_mode,
  ADD COLUMN area_max INT NULL COMMENT '适用面积上限（㎡），空=不限' AFTER people_count,
  ADD COLUMN price_unit INT NULL COMMENT '计价方式：1 按次一口价 / 2 按小时计费 / 3 按平方米计费 / 4 按人天计费 / 5 面议，空=面议' AFTER area_max,
  ADD COLUMN validity_days INT NULL COMMENT '服务期限（下单后 N 天内有效），空=长期有效' AFTER price_unit;

-- 2) 校验（应返回 5 行）
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
--   FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = DATABASE()
--    AND TABLE_NAME = 'service_items'
--    AND COLUMN_NAME IN ('service_mode','people_count','area_max','price_unit','validity_days')
--  ORDER BY ORDINAL_POSITION;

-- 回滚（如确需撤销）
-- ALTER TABLE service_items
--   DROP COLUMN service_mode,
--   DROP COLUMN people_count,
--   DROP COLUMN area_max,
--   DROP COLUMN price_unit,
--   DROP COLUMN validity_days;
