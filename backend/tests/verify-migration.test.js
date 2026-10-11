const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findCountMismatches,
  pickSampleOrderIds,
} = require('../dist/scripts/verify-migration');

test('findCountMismatches 仅返回记录数不一致的表', () => {
  const mismatches = findCountMismatches([
    { table: 'users', sqliteCount: 10, mysqlCount: 10 },
    { table: 'orders', sqliteCount: 25, mysqlCount: 24 },
    { table: 'order_photos', sqliteCount: 18, mysqlCount: 18 },
    { table: 'order_histories', sqliteCount: 40, mysqlCount: 39 },
  ]);

  assert.deepEqual(mismatches, [
    { table: 'orders', sqliteCount: 25, mysqlCount: 24 },
    { table: 'order_histories', sqliteCount: 40, mysqlCount: 39 },
  ]);
});

test('pickSampleOrderIds 返回最多 5 个升序订单 ID', () => {
  const ids = pickSampleOrderIds([
    { id: 9 },
    { id: 3 },
    { id: 15 },
    { id: 3 },
    { id: 20 },
    { id: 1 },
    { id: 7 },
  ]);

  assert.deepEqual(ids, [1, 3, 7, 9, 15]);
});
