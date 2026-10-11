const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MIGRATION_TABLES,
  normalizeCellValue,
  buildAutoIncrementSql,
} = require('../dist/scripts/migrate-sqlite-to-mysql');

test('迁移表顺序满足订单主链依赖', () => {
  const names = MIGRATION_TABLES.map((item) => item.name);

  assert.ok(names.indexOf('users') < names.indexOf('orders'));
  assert.ok(names.indexOf('user_addresses') < names.indexOf('orders'));
  assert.ok(names.indexOf('service_items') < names.indexOf('orders'));
  assert.ok(names.indexOf('employees') < names.indexOf('orders'));
  assert.ok(names.indexOf('orders') < names.indexOf('order_employees'));
  assert.ok(names.indexOf('orders') < names.indexOf('order_materials'));
  assert.ok(names.indexOf('orders') < names.indexOf('order_adjustments'));
  assert.ok(names.indexOf('orders') < names.indexOf('order_photos'));
  assert.ok(names.indexOf('orders') < names.indexOf('order_histories'));
  assert.ok(names.indexOf('orders') < names.indexOf('reviews'));
});

test('normalizeCellValue 保留数值并兼容空值、布尔与日期', () => {
  assert.equal(normalizeCellValue(undefined), null);
  assert.equal(normalizeCellValue(null), null);
  assert.equal(normalizeCellValue(true), 1);
  assert.equal(normalizeCellValue(false), 0);
  assert.equal(normalizeCellValue(12.5), 12.5);
  assert.equal(normalizeCellValue('abc'), 'abc');
  assert.equal(normalizeCellValue(new Date('2026-07-27T01:02:03.000Z')), '2026-07-27 01:02:03');
});

test('buildAutoIncrementSql 为主键表生成自增修正语句', () => {
  assert.equal(
    buildAutoIncrementSql('orders', 128),
    'ALTER TABLE `orders` AUTO_INCREMENT = 129',
  );
});
