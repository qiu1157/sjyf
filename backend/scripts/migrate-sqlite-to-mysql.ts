import * as fs from 'fs';
import * as path from 'path';
import { createConnection, Connection, ConnectionOptions } from 'mysql2/promise';

// sql.js 没有稳定的 ESM 类型入口，这里用 require 保持脚本可直接执行
// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require('sql.js');

type SqliteDatabase = {
  prepare(sql: string): {
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  };
  close(): void;
};

type MigrationTable = {
  name: string;
  optional?: boolean;
};

type MigrationSummary = {
  table: string;
  rowCount: number;
  skipped: boolean;
};

export const MIGRATION_TABLES: MigrationTable[] = [
  { name: 'employees' },
  { name: 'users' },
  { name: 'service_categories' },
  { name: 'service_items' },
  { name: 'materials' },
  { name: 'coupons' },
  { name: 'user_addresses' },
  { name: 'user_coupons' },
  { name: 'role_menu_permissions' },
  { name: 'orders' },
  { name: 'order_employees' },
  { name: 'order_materials' },
  { name: 'order_adjustments' },
  { name: 'order_photos' },
  { name: 'order_histories' },
  { name: 'reviews' },
  { name: 'operation_logs', optional: true },
];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDateTime(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}

export function normalizeCellValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return formatDateTime(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  return value;
}

export function buildAutoIncrementSql(tableName: string, maxId: number) {
  return `ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${maxId + 1}`;
}

function querySqliteRows(db: SqliteDatabase, sql: string) {
  const statement = db.prepare(sql);
  const rows: Record<string, unknown>[] = [];

  try {
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
  } finally {
    statement.free();
  }

  return rows;
}

function listExistingSqliteTables(db: SqliteDatabase) {
  const rows = querySqliteRows(db, "SELECT name FROM sqlite_master WHERE type='table'");
  return new Set(rows.map((row) => String(row.name)));
}

async function truncateTargetTable(connection: Connection, tableName: string) {
  await connection.execute(`DELETE FROM \`${tableName}\``);
}

async function insertRows(connection: Connection, tableName: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map((column) => `\`${column}\``).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const insertSql = `INSERT INTO \`${tableName}\` (${quotedColumns}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = columns.map((column) => normalizeCellValue(row[column]));
    await connection.query(insertSql, values as any[]);
  }

  const numericIds = rows
    .map((row) => Number(row.id))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (numericIds.length) {
    await connection.execute(buildAutoIncrementSql(tableName, Math.max(...numericIds)));
  }
}

async function migrateSingleTable(
  connection: Connection,
  db: SqliteDatabase,
  existingTables: Set<string>,
  table: MigrationTable,
): Promise<MigrationSummary> {
  if (!existingTables.has(table.name)) {
    if (table.optional) {
      console.log(`⏭️ 跳过可选表：${table.name}`);
      return { table: table.name, rowCount: 0, skipped: true };
    }
    throw new Error(`SQLite 中缺少表：${table.name}`);
  }

  const rows = querySqliteRows(db, `SELECT * FROM ${table.name}`);
  await truncateTargetTable(connection, table.name);
  await insertRows(connection, table.name, rows);
  console.log(`✅ 已迁移 ${table.name}：${rows.length} 行`);
  return { table: table.name, rowCount: rows.length, skipped: false };
}

function resolveSqliteFile(env: NodeJS.ProcessEnv) {
  const input = env.SQLITE_FILE || env.DB_DATABASE || './dev.db';
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}

function readMysqlConfig(env: NodeJS.ProcessEnv): ConnectionOptions {
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

export async function migrateSqliteToMysql(env: NodeJS.ProcessEnv = process.env) {
  const sqliteFile = resolveSqliteFile(env);
  if (!fs.existsSync(sqliteFile)) {
    throw new Error(`SQLite 文件不存在：${sqliteFile}`);
  }

  const mysqlConfig = readMysqlConfig(env);
  if (!mysqlConfig.user || !mysqlConfig.database) {
    throw new Error('缺少 MySQL 连接信息，请检查 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME');
  }

  const sqlJs = await initSqlJs();
  const sqliteBuffer = fs.readFileSync(sqliteFile);
  const db: SqliteDatabase = new sqlJs.Database(new Uint8Array(sqliteBuffer));
  const connection = await createConnection(mysqlConfig);

  try {
    const existingTables = listExistingSqliteTables(db);
    const summaries: MigrationSummary[] = [];

    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of MIGRATION_TABLES) {
      summaries.push(await migrateSingleTable(connection, db, existingTables, table));
    }

    return summaries;
  } finally {
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    await connection.end();
    db.close();
  }
}

async function main() {
  const summaries = await migrateSqliteToMysql(process.env);
  const totalRows = summaries.reduce((sum, item) => sum + item.rowCount, 0);
  console.log(`🎉 迁移完成：${summaries.length} 张表，合计 ${totalRows} 行`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 迁移失败：', error.message);
    process.exit(1);
  });
}
