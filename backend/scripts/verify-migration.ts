import * as fs from 'fs';
import * as path from 'path';
import { createConnection, Connection } from 'mysql2/promise';
import { MIGRATION_TABLES } from './migrate-sqlite-to-mysql';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require('sql.js');

type CountReport = {
  table: string;
  sqliteCount: number;
  mysqlCount: number;
};

type OrderSample = {
  id: number;
  orderNo: unknown;
  status: unknown;
  bookDate: unknown;
  bookTime: unknown;
  totalAmount: unknown;
};

type SqliteDatabase = {
  prepare(sql: string): {
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  };
  close(): void;
};

function resolveSqliteFile(env: NodeJS.ProcessEnv) {
  const input = env.SQLITE_FILE || env.DB_DATABASE || './dev.db';
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}

function readMysqlConfig(env: NodeJS.ProcessEnv) {
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

function normalizeSampleValue(value: unknown) {
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (value.trim() !== '' && Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return value;
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

export function findCountMismatches(reports: CountReport[]) {
  return reports.filter((item) => item.sqliteCount !== item.mysqlCount);
}

export function pickSampleOrderIds(rows: Array<Record<string, unknown>>, limit = 5) {
  return Array.from(
    new Set(
      rows
        .map((row) => Number(row.id))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  )
    .sort((a, b) => a - b)
    .slice(0, limit);
}

async function readMysqlCount(connection: Connection, tableName: string) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
  const firstRow = Array.isArray(rows) ? rows[0] as Record<string, unknown> : { total: 0 };
  return Number(firstRow.total || 0);
}

async function buildCountReports(sqliteDb: SqliteDatabase, mysqlConnection: Connection) {
  const reports: CountReport[] = [];

  for (const table of MIGRATION_TABLES) {
    const sqliteRows = querySqliteRows(sqliteDb, `SELECT COUNT(*) AS total FROM ${table.name}`);
    const sqliteCount = Number(sqliteRows[0]?.total || 0);
    const mysqlCount = await readMysqlCount(mysqlConnection, table.name);
    reports.push({ table: table.name, sqliteCount, mysqlCount });
  }

  return reports;
}

function mapSampleRow(row: Record<string, unknown>): OrderSample {
  return {
    id: Number(row.id || 0),
    orderNo: normalizeSampleValue(row.order_no),
    status: normalizeSampleValue(row.status),
    bookDate: normalizeSampleValue(row.book_date),
    bookTime: normalizeSampleValue(row.book_time),
    totalAmount: normalizeSampleValue(row.total_amount),
  };
}

async function readMysqlOrderSample(connection: Connection, orderId: number) {
  const [rows] = await connection.query(
    'SELECT id, order_no, status, book_date, book_time, total_amount FROM `orders` WHERE id = ?',
    [orderId],
  );
  const firstRow = Array.isArray(rows) ? rows[0] as Record<string, unknown> : undefined;
  return firstRow ? mapSampleRow(firstRow) : null;
}

async function buildOrderSamples(sqliteDb: SqliteDatabase, mysqlConnection: Connection) {
  const sqliteRows = querySqliteRows(
    sqliteDb,
    'SELECT id, order_no, status, book_date, book_time, total_amount FROM orders ORDER BY id ASC LIMIT 20',
  );
  const orderIds = pickSampleOrderIds(sqliteRows);
  const samples: Array<{ orderId: number; sqlite: OrderSample | null; mysql: OrderSample | null }> = [];

  for (const orderId of orderIds) {
    const sqliteRow = sqliteRows.find((item) => Number(item.id) === orderId);
    const mysqlRow = await readMysqlOrderSample(mysqlConnection, orderId);
    samples.push({
      orderId,
      sqlite: sqliteRow ? mapSampleRow(sqliteRow) : null,
      mysql: mysqlRow,
    });
  }

  return samples;
}

export async function verifyMigration(env: NodeJS.ProcessEnv = process.env) {
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
  const sqliteDb: SqliteDatabase = new sqlJs.Database(new Uint8Array(sqliteBuffer));
  const mysqlConnection = await createConnection(mysqlConfig);

  try {
    const reports = await buildCountReports(sqliteDb, mysqlConnection);
    const mismatches = findCountMismatches(reports);
    const orderSamples = await buildOrderSamples(sqliteDb, mysqlConnection);

    return {
      reports,
      mismatches,
      orderSamples,
    };
  } finally {
    await mysqlConnection.end();
    sqliteDb.close();
  }
}

async function main() {
  const result = await verifyMigration(process.env);
  const matched = result.reports.length - result.mismatches.length;

  console.log(`📊 记录数校验完成：${matched}/${result.reports.length} 张表一致`);
  for (const item of result.reports) {
    const mark = item.sqliteCount === item.mysqlCount ? '✅' : '❌';
    console.log(`${mark} ${item.table}: sqlite=${item.sqliteCount}, mysql=${item.mysqlCount}`);
  }

  console.log('🔎 抽样订单：');
  for (const sample of result.orderSamples) {
    console.log(JSON.stringify(sample, null, 2));
  }

  if (result.mismatches.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 校验失败：', error.message);
    process.exit(1);
  });
}
