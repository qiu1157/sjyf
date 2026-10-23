/**
 * US-038：一次性重算 content_blocks 非空服务的 content HTML 快照
 * 目的：结构化块（参数表）已改为小程序端原生渲染，需重算旧快照，
 *       消除「旧快照里的参数表」与「新原生参数表」的重复展示。
 * 用法：
 *   npm run build                                   # 先编译（脚本依赖 dist 产物）
 *   node scripts/rebuild-content-snapshot.js            # 实际写库
 *   node scripts/rebuild-content-snapshot.js --dry-run  # 只统计不写库
 * 连接参数（环境变量）：DB_HOST(默认 127.0.0.1) / DB_PORT(默认 3306) / DB_USER / DB_PASSWORD / DB_NAME
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const UTIL_PATH = path.join(__dirname, '..', 'dist', 'modules', 'service', 'content-blocks.util.js');

/** 读取 MySQL 连接配置（约定参照 scripts/verify-migration.ts 的 readMysqlConfig） */
function readMysqlConfig(env) {
  return {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || '3306'),
    user: env.DB_USER || '',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || '',
    dateStrings: true,
    decimalNumbers: true,
  };
}

/** 加载编译产物；文件不存在时打印构建提示并返回 null */
function loadUtil() {
  if (!fs.existsSync(UTIL_PATH)) {
    console.error('❌ 未找到编译产物 dist/modules/service/content-blocks.util.js，请先在 backend 目录执行 npm run build');
    return null;
  }
  return require(UTIL_PATH);
}

/**
 * 重算 content 快照
 * @param {{ dryRun?: boolean, env?: NodeJS.ProcessEnv }} options
 * @returns {Promise<{ scanned: number, updated: number, skipped: number }>}
 */
async function rebuildContentSnapshot(options = {}) {
  const dryRun = options.dryRun === true;
  const env = options.env || process.env;

  const util = loadUtil();
  if (!util) throw new Error('缺少编译产物，无法重算 content 快照');
  const { parseStoredBlocks, renderBlocksToHtml } = util;

  const config = readMysqlConfig(env);
  if (!config.user || !config.database) {
    throw new Error('缺少 MySQL 连接信息，请检查 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME');
  }

  const connection = await mysql.createConnection(config);
  const stats = { scanned: 0, updated: 0, skipped: 0 };

  try {
    const [rows] = await connection.query(
      "SELECT id, name, content_blocks, content FROM service_items WHERE content_blocks IS NOT NULL AND content_blocks <> ''",
    );

    for (const row of rows) {
      stats.scanned += 1;
      const payload = parseStoredBlocks(row.content_blocks);
      if (!payload) {
        stats.skipped += 1;
        continue;
      }
      const nextContent = renderBlocksToHtml(payload);
      if (nextContent === row.content) {
        stats.skipped += 1;
        continue;
      }
      if (!dryRun) {
        // 写 updated_at = updated_at：避免批量刷新把后台列表「最后修改时间」排序全部打乱
        await connection.query('UPDATE service_items SET content = ?, updated_at = updated_at WHERE id = ?', [
          nextContent,
          row.id,
        ]);
      }
      stats.updated += 1;
    }
  } finally {
    await connection.end();
  }

  return stats;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`🔧 开始重算 content 快照${dryRun ? '（dry-run：只统计不写库）' : ''}...`);
  try {
    const stats = await rebuildContentSnapshot({ dryRun });
    console.log(`✅ 扫描 ${stats.scanned} 行，受影响 ${stats.updated} 行，跳过 ${stats.skipped} 行`);
  } catch (error) {
    console.error('❌ 重算失败：', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { rebuildContentSnapshot, readMysqlConfig };
